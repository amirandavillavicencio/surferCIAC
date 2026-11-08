"""Record a 20-second fixed-clock replay of a compiled Surfer CIAC build."""
import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

root, url, output = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
output.mkdir(parents=True, exist_ok=True)
bank = json.loads((root / 'data/questions.json').read_text())
controller = subprocess.check_output([
    str(root / 'upstream/node_modules/.bin/esbuild'), str(root / 'tests/traffic-controller.ts'),
    '--bundle', '--format=iife', '--global-name=Traffic',
], text=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=[
        '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    ])
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def api(route):
        if route.request.url.endswith('/start'):
            route.fulfill(json={'token': 'local-replay', 'question': bank[0]})
        else:
            route.fulfill(json={'correct': True, 'points': 100, 'penaltySeconds': 0,
                                'question': bank[1], 'ranking': []})

    page.route('**/api/**', api)
    page.goto(url + '/?test&quiz')
    page.wait_for_function('window.__run?.ready', timeout=60000)
    page.add_script_tag(content=controller)
    page.evaluate('''() => {
      const r = window.__run;
      r.start({seed: 1, tutorial: false});
      r.plans = [];
      r.advance = (frames, draw) => {
        for (let i = 0; i < frames; i++) {
          for (const plan of Traffic.plansOf(r.sim)) {
            if (!r.plans.some(p => p.start === plan.start)) r.plans.push(plan);
          }
          Traffic.driveTraffic(r.sim, r.plans);
          r.frame(1/60);
        }
        if (draw) r.render();
        return {d: r.sim.d, time: r.sim.time, x: r.sim.x, y: r.sim.y,
                alive: r.sim.alive, surface: r.sim.groundY, sliding: r.sim.sliding,
                question: !document.querySelector('.ciac-dialog').hidden,
                clip: r.world.player.current};
      };
    }''')
    page.wait_for_function('__run.quiz.phase === "ready"')
    state = {'d': 0}
    while state['d'] < 273:
        state = page.evaluate('__run.advance(12, false)')
        assert state['alive'], state
    states = []
    for frame in range(240):
        state = page.evaluate('__run.advance(5, true)')
        assert state['alive'], state
        states.append(state)
        page.screenshot(path=str(output / f'{frame:04}.jpg'), type='jpeg', quality=87)
    assert not errors, errors
    (output / 'states.json').write_text(json.dumps(states))
    browser.close()

"""Record an unmodified seeded race with explicit controls and live Pages API."""
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
questions = {q["id"]: q["correcta"] for q in json.loads((root / "data/questions.json").read_text())}
pilot = subprocess.check_output([
    str(root / "upstream/node_modules/.bin/esbuild"), str(root / "tests/decision-pilot.ts"),
    "--bundle", "--format=iife", "--global-name=DecisionPilot",
], text=True)
url = os.environ.get("GAME_URL", "http://127.0.0.1:8788")
fps = 20
segments = [
    (0, 20, "Surfer_CIAC_01_inicio.mp4"),
    (20, 80, "Surfer_CIAC_02_recorrido.mp4"),
    (95, 115, "Surfer_CIAC_03_avanzado.mp4"),
]
api_log = []
controls = []
errors = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM", "/usr/bin/chromium"), headless=True,
        args=["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    )
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1,
                            is_mobile=True, has_touch=True)
    page.on("pageerror", lambda error: errors.append(str(error)))

    def log_response(response):
        path = response.url.split("/api/")[-1]
        if path in {"start", "answer"}:
            body = response.json()
            api_log.append({"path": path, "status": response.status, "correct": body.get("correct"),
                            "question": (body.get("question") or {}).get("id"), "points": body.get("points"),
                            "lane": (response.request.post_data_json or {}).get("lane")})

    page.on("response", log_response)
    page.goto(url + "/?test&quiz", wait_until="load")
    page.wait_for_function("window.__run?.ready", timeout=60000)
    page.add_script_tag(content=pilot)
    page.evaluate("""(answers) => {
      const run = window.__run;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;z-index:500;bottom:12px;left:10px;padding:5px 7px;color:white;background:#15202a;border-radius:4px;font:12px system-ui;pointer-events:none';
      document.body.append(overlay);
      window.evidence = {answers, overlay, last: '', lastTime: -10};
      document.querySelector('[aria-label="Seleccionar semestre"]').value = 'Todos';
      run.start({seed: 2, tutorial: false});
    }""", questions)
    page.wait_for_function("window.__run.quiz.activeGate === 180")
    metadata = page.evaluate("""() => {
      const run = window.__run;
      return {width:innerWidth,height:innerHeight,webgl:run.renderer.getContext().getParameter(run.renderer.getContext().VERSION),
        seed:2,invincible:run.sim.invincible,speedOverride:run.sim.speedOverride,noSpawn:run.sim.noSpawn};
    }""")
    print(metadata, flush=True)
    assert [metadata["width"], metadata["height"]] == [390, 844]

    cdp = page.context.new_cdp_session(page)
    advance = """({draw, dt}) => {
      const r = window.__run, s = r.sim, e = window.evidence;
      const inputs = [];
      const input = (key) => {
        inputs.push({time:s.time,d:s.d,key,lane:s.lane,height:s.y});
        r.input(key === 'jump' ? 'up' : key);
      };
      if (r.quiz.phase === 'question') {
        const lane = e.answers[r.quiz.question.id];
        if (s.lane !== lane) input(lane < s.lane ? 'left' : 'right');
      }
      DecisionPilot.decisionPilot(s, input);
      if (inputs.length) {
        e.last = inputs.map(item => ({left:'←',right:'→',jump:'Salto',down:'Deslizar'}[item.key])).join(' + ');
        e.lastTime = s.time;
      }
      if (draw) {
        r.presentFrame(dt);
        e.overlay.textContent = 'Piloto de prueba · ' + s.time.toFixed(1) + ' s · ' + Math.floor(s.d) + ' m' +
          (s.time - e.lastTime < .75 ? ' · ' + e.last : '');
      } else r.frame(dt);
      return {alive:s.alive,d:s.d,time:s.time,inputs,phase:r.quiz.phase,question:r.quiz.question?.id,
        shown:!document.querySelector('.ciac-dialog').hidden,choices:r.quiz.choices.length};
    }"""
    frame = 0
    observed = set()
    ranges = []
    for start, end, filename in segments:
        skip_start, skip_frame = time.monotonic(), frame
        while frame < start * fps:
            target = skip_start + (frame - skip_frame) / fps
            if target > time.monotonic():
                page.wait_for_timeout((target - time.monotonic()) * 1000)
            state = page.evaluate(advance, {"draw": False, "dt": 1 / fps})
            assert state["alive"], state
            controls.extend(state["inputs"])
            frame += 1
        distance_start = 0 if frame == 0 else state["d"]
        encoder = subprocess.Popen([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-vcodec", "mjpeg",
            "-framerate", str(fps), "-i", "-", "-c:v", "libx264", "-threads", "2",
            "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(out / filename),
        ], stdin=subprocess.PIPE)
        try:
            capture_start, capture_frame = time.monotonic(), frame
            while frame < end * fps:
                target = capture_start + (frame - capture_frame) / fps
                if target > time.monotonic():
                    page.wait_for_timeout((target - time.monotonic()) * 1000)
                state = page.evaluate(advance, {"draw": True, "dt": 1 / fps})
                assert state["alive"], state
                controls.extend(state["inputs"])
                if state["shown"]:
                    assert state["choices"] == 3
                    observed.add(state["question"])
                capture = cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 78, "fromSurface": True})
                encoder.stdin.write(base64.b64decode(capture["data"]))
                frame += 1
        finally:
            encoder.stdin.close()
            assert encoder.wait() == 0
        ranges.append({"file": filename, "timeStart": start, "timeEnd": end,
                       "distanceStart": distance_start, "distanceEnd": state["d"]})
        print(ranges[-1], flush=True)
    assert not errors, errors
    assert len(observed) >= 2, observed
    answers = [entry for entry in api_log if entry["path"] == "answer"]
    assert len(answers) >= 2 and all(entry["status"] == 200 and entry["correct"] for entry in answers), api_log
    (out / "Surfer_CIAC_registro.json").write_text(json.dumps(
        {"browser": metadata, "clips": ranges, "controls": controls, "api": api_log}, indent=2,
    ))
    browser.close()

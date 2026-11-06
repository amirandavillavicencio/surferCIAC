# Gameplay corrections

The integration remains reproducible from the pinned upstream commit. `prepare.mjs`
resets and patches upstream, then applies `polish-game.mjs`; commit the CIAC modules
and patch scripts, never the generated upstream working tree.

- `FrameClock`: 120 Hz simulation, interpolated runner presentation, up to 24
  recovery steps per display frame and at most 0.5 s retained debt. Sustained
  15–60 FPS retains all elapsed time. Tab suspension/pauses reset the clock;
  exceptional stalls beyond the recovery budget intentionally drop excess time.
- `physical-lane`: interpolate x at the crossing distance within the physics
  step; answer selection uses position rather than the destination lane.
  The presentation highlight uses the same spatial boundaries.
- `encounters`: reservation-aligned, mirrored rooftop encounters with approach
  barriers, a ramp, two stationary roofs, a physical jump transfer, an oncoming
  train, a safe drop and a slide. Coins follow the elevated trajectory. The
  original route solver retains the ground escape check. Difficulty still rises
  with speed; encounters now favor predictable action sequences over random rows.
- Nearby overhead wire segments are excluded from the camera corridor; distant
  wires and the rest of the environment remain. Camera movement stays smooth.
- Shoe/toe geometry receives a reversible sole contact constraint after evaluating
  each Mixamo pose. It does not translate the character or change collision boxes.

## Validation

Use the prepared Node 22 environment, without reinstalling dependencies:

```
npm test
npm --prefix upstream run build
node scripts/copy-dist.mjs
```

`tests/polish.ts` checks fixed-step time/trajectory/penalty parity, 216 physical
crossing cases, 810 encounters at three speeds, and 30 continuous 4000 m seeded
runs through the real physics without invincibility or teleportation. In the
same active-reservation sample used for the audit, gaps >80 m decreased from
688 to 0; maximum gap decreased from 327.8028 m to 75.3 m.

With the resulting `dist` served locally and existing Python Playwright/Chromium:

```
python3 -m http.server 8788 --bind 127.0.0.1 --directory dist
# In another terminal:
python3 tests/browser-gameplay.py
```

The browser checks 390 x 844, ground/ramp/roof/jump/drop/roll in all three lanes,
sole vertex clearance, animation parity across refresh schedules, and a continuous
sequence through two quizzes. API replies are local fixtures; this is explicitly
not a production API or prize competition test. Screenshots are written to /tmp.

Pages builds now emit `build.json` with the exact source commit and entrypoint
SHA-256 so a deployed release can be checked without changing the API or D1.

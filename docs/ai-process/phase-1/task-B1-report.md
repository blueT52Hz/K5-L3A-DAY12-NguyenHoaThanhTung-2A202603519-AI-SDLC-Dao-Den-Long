# Task B1 report
Status: DONE. Models in src/web/models (player-may, shade, lantern, mote, island-environment, index re-exports). Tests: tests/models/models.test.ts, 4 pass. tsc: no errors in models.
Notes: Lantern PointLight is created once (intensity 0 unlit, 40 lit, 1 light per lantern, 5 total <= 8). Mote geometry/material shared. Env brightness: ambient 0.25->0.85, hemi 0.15->0.85 over n/5.

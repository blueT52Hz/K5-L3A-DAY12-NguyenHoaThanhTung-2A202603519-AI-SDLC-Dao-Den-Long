# Task C1 report
Status: DONE (step 2 browser check skipped, core absent)
Commit: eda2255 feat(web): game loop, input, camera, hud and restart (local, not pushed)
Files: index.html, src/web/{main,fixed-step-loop,keyboard-mouse-input,camera-rig,scene-sync,hud}.ts, hud.css, vite-env.d.ts (all <200 lines)
tsc: only errors = missing ../core/create-game and ../core/step (not yet present).
Notes:
- Input: held states sent each tick (core does edge detect via prevButtons). Yaw state lives in input module (getCamYawDeg/updateYaw). Mouse drag right -> yaw decreases.
- Camera pos = player - (sin yaw, 0, cos yaw)*10, +7 up.
- SceneSync.reset(state) rebuilds lanterns/motes/shades on restart. Shade materials cloned per shade for stun fade (opacity 0.4 + shake).
- Loss reason: flames<=0 -> "hết máu", else "trời đã sáng".
- Added ambient light (0.5) in main.ts as fallback; background 0x140824. Seed = Date.now() % 2147483647.
- HP chip uses 🏮 emoji repeated.
Unresolved: browser run needed in integration; if env model adds own lights, ambient may need tuning.

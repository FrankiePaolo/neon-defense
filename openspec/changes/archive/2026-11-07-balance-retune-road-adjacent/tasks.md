# Tasks

"Balance" means `npm run balance`; "play test" means `npm run play-test`.

## 1. Retune and verify

- [x] 1.1 In `js/config.js` set `CONFIG.DIFFICULTY` to `{ easy: 46, normal: 32, hard: 21 }` `TOWER_DEFS.frost.cost` to 130 and `TOWER_DEFS.frost.damage` to 5 (design decisions 1 and 2), and bump the `sw.js` cache name. Verify balance exits 0 with "all 90 checks pass" and still prints unlock waves Frost 2, Lightning 4, Cannon 7, Support 9, Sniper 11 on both grids.
- [x] 1.2 Run `npm run balance -- --seeds 10`. Verify it exits 0; if a check fails, stop and report the check and its value rather than tuning further.
- [x] 1.3 Run the full play test. Verify it exits 0 on every layout and language.

## Workflow follow-up

- Tick task 4.3 of `persistent-core-unlocks` once 1.1 to 1.3 pass, then archive both changes.

# Proposal

## Why

Commit 4145a6b ("Only allow towers on tiles next to the road") cut the tiles a tower can go on, and since then `npm run balance` fails 4 checks that passed on the commit before it: Frost damage per gold on the phone grid is above 1.25x of the Blaster's, the naive player reaches only wave 19 on Easy (phone), lasts to wave 14 on Hard (desktop), and the desktop Easy > Normal > Hard order breaks. The balance command must exit 0 again before `persistent-core-unlocks` can close its last task and before any later balance change can be checked.

## What Changes

- **Easy path longer, Hard path shorter.** Minimum path length goes from 44 to 46 tiles on Easy and from 22 to 21 on Hard. Normal stays at 32. This restores the naive outcomes on both grids: Easy 21 (phone) and 23 (desktop), Hard 13 on both.
- **Frost costs 130 gold instead of 120, and its base damage drops from 6 to 5.** This brings Frost back inside the 0.75x to 1.25x value band on both grids with 5 and 10 seeds, and keeps the Frostbite path check above 0.75x (0.77x with 10 seeds). The price alone fails the desktop check with 10 seeds.
- No rule, unlock price, wave curve or enemy change. Unlock waves stay Frost 2, Lightning 4, Cannon 7, Support 9, Sniper 11.
- Out of scope: the 1.24x Frost margin on the phone grid stays thin. A wider fix (Frost's slow or the value check itself) is a separate decision.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. Only numbers move, so that the existing `difficulty-levels` and `tower-balance` requirements hold again. The change sets `skip_specs: true`.

## Impact

- Code: `js/config.js` (`CONFIG.DIFFICULTY` easy and hard, `TOWER_DEFS.frost.cost` and `damage`).
- Players see Frost at 130 gold and 5 base damage in the panel and the sheet, a slightly longer Easy path and a slightly shorter Hard path. Leaderboard scores stay comparable: no score rule changes.
- No backend, API, storage or service worker change beyond the cache bump that ships the new `config.js`.

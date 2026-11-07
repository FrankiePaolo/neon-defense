# Design

## Context

See proposal.md for the failing checks. Facts that shape the approach:

- The simulator places towers through `grid.isPlaceable`, so it already obeys the road-adjacency rule. The rule itself is correct and stays. Only numbers need to move.
- On commit 8eb917a (before the rule) all 4 checks pass. Frost on the phone grid was already on the edge (1.25x, passing).
- The levers are in `js/config.js`: `CONFIG.DIFFICULTY` (minimum path length per difficulty), `CONFIG.DIFFICULTY_HP` (enemy HP per difficulty) and the Frost entry in `TOWER_DEFS`.
- The values below were tried on scratch copies of the current tree (persistent-core-unlocks applied) with the default 5 seeds. Each was a full `simulate-balance.mjs` run.

## Goals / Non-Goals

**Goals:**
- All 90 balance checks pass with the fewest number changes.
- Normal is untouched, so the wave-scaling targets measured on Normal do not move.

**Non-Goals:**
- Widening the Frost margin on the phone grid beyond what the check needs.
- Any change to the simulator or to a check threshold.

## Decisions

### 1. Path length, not enemy HP, for the difficulty checks
Easy 44 → 46, Hard 22 → 21. Result: naive Easy 21 (phone) and 23 (desktop), naive Hard 13 and 13, sensible Hard 36 and 36, wave-1 Scout and map-generation checks still pass.
*Alternative tried:* Easy HP 0.7 and Hard HP 1.05 or 1.1. Rejected: Hard HP above 1 breaks "one Blaster holds wave 1" on Hard on both grids, and 1.1 also drops the sensible Hard run to wave 19 or 20 (target 25).

### 2. Frost price 130 and base damage 5
Frost cost 120 → 130 and base damage 6 → 5. Result with decision 1: 5 seeds give Frost value 1.24x (phone) and 1.06x (desktop), Frostbite path 0.78x; 10 seeds give 1.23x and 1.25x (passing), Frostbite 0.77x (target 0.75x), sensible Hard 33 (phone) and 36 (desktop).
*Alternatives tried, all with decision 1:*
- Price 130 alone: passes with 5 seeds, fails the desktop value check with 10 seeds (1.25x, just over the limit).
- Price 130 and slow duration 1.2 → 1.0 s: fails Frostbite with 10 seeds (0.75x, below threshold after rounding).
- Slow 0.20 → 0.18: fails Frostbite (0.75x, below threshold after rounding).
- Price 125 alone, without decision 1: still 1.25x on the phone grid.
Price plus damage is the only tried option that passes with 10 seeds. Frost still plays as a slow tower; its upgrades are unchanged.

## Risks / Trade-offs

- [The Frost value margin stays thin: 1.24x phone at 5 seeds, 1.25x desktop at 10 seeds] → Accepted. Any later tower change re-runs the balance command, which will catch a drift.
- [Seed sensitivity: results come from the default 5 seeds] → Task 1.2 also runs the full check with `--seeds 10`.
- [Players notice Frost at 130 gold and lower base damage] → Visible only as numbers in the panel. No text names them.

## Migration Plan

Ship with a `sw.js` cache bump so phones fetch the new `config.js`. Rollback is a redeploy of the previous build.

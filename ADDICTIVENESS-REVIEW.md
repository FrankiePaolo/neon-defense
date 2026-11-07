# Addictiveness review

Date: 2026-11-07. Neon Defense compared against the mechanics that keep players in
Bloons TD 6, Kingdom Rush, Infinitode 2, Rogue Tower and Isle of Arrows.

**Verdict:** the combat loop is solid (combos, perfect waves, boss waves, dual
upgrade paths). What is missing is almost everything that happens between runs,
and the decisions that happen between waves. Those create the "one more run" pull.

## What the sticky games have that Neon Defense does not

| Hook | BTD6 | Kingdom Rush | Rogue-like TDs | Neon Defense |
|---|---|---|---|---|
| Progress that survives a run | Monkey Knowledge, Monkey Money | Stars, heroes | Research trees | No. Unlocks reset every run |
| A reason to come back today | Daily challenge, events | Heroic and Iron modes | Daily seeds | No |
| Choices that make runs differ | Hundreds of upgrade combos | Hero and tower choice | Random perk picks | Random map only |
| Something to do mid-wave | Abilities | Hero, meteor, reinforcements | Varies | Place and upgrade only |
| Play after winning | Freeplay past round 100 | Challenge modes | Endless is the game | Run ends at wave 35 |
| Tempo control | Fixed, with autoplay | Call wave early for gold | Varies | Wait and press Start |

## Biggest problems in the current design

1. **Progress resets every run.** `game.js` calls `progressTracker.reset()` on
   start, so the score-based unlocks (Frost at 450, up to Sniper at 40000) are
   re-earned each time. A new player sees Blaster only, every run. Persisting the
   best score is a one-line fix and should ship first.
2. **Nothing is learnable.** Maps and wave compositions are fully random
   (`Math.random` in `waves.js` and `grid.js`), so a loss does not produce a plan.
   BTD6 and Kingdom Rush are addictive because rounds are fixed and the player
   knows exactly what to fix next time.
3. **Victory is a dead end.** Wave 35 ends the run instead of opening an endless
   mode where the leaderboard really lives.
4. **Dead time between waves.** The player waits, then presses Start. No pressure,
   no reward for confidence.

## Recommendations, in order

1. **Persist unlocks and add a small meta currency.** Earn "cores" per run based
   on wave reached. Spend them on unlocks only, not raw power, so the leaderboard
   stays fair: towers, starting loadouts, map styles, a third upgrade path. Show
   "next unlock in N" on the end screen (partly computed in `ui.js` already).
2. **Call the next wave early for gold.** Kingdom Rush's best mechanic. While a
   wave is alive, Start stays active and pays a gold bonus scaled by remaining
   enemies. Turns waiting into a decision and halves session length on mobile.
   Needs overlapping waves in `WaveManager`.
3. **Pick a perk after every boss.** Every 5 waves, offer 3 random perks (chain
   hits one more target, interest cap +50, Frost slows bosses). Pick one. This is
   what makes Rogue Tower and Isle of Arrows runs feel different.
4. **Endless after wave 35.** Keep the curve running and let the player continue.
   Leaderboard sorted by wave then score. `maxPlausibleScore` in `scores.mjs`
   needs lifting past 35.
5. **Daily challenge.** One seeded map, fixed wave list and one modifier per day,
   same for everyone, with its own board and a day streak counter. Requires a
   seedable RNG in `utils.js` (28 `Math.random` call sites) and a `mode` column
   on the scores table. This is the retention hook the others build on.
6. **One active ability.** A single cooldown button (EMP stun for 2 seconds, or
   an orbital strike). A panic button; near-misses are what players remember.
7. **Richer end screen.** MVP tower, damage per tower, kills, "new personal best"
   celebration, leaderboard rank and the gap to the next player.

Smallest high-value step: fix the unlock reset and add the early-call bonus.
Together about 100 lines, and they attack the two biggest gaps.

## Sources

- Kingdom Rush campaign level design: https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design
- Kingdom Rush stars and heroes: https://en.wikipedia.org/wiki/Kingdom_Rush
- BTD6 progression currencies: https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/BTD6
- BTD6 daily challenge history: https://www.bloonswiki.com/Event_history:Daily_Challenge_(BTD6)/January_2019
- Infinitode 2: https://store.steampowered.com/app/937310
- Isle of Arrows: https://vaporlens.app/app/1946970/isle_of_arrows.md
- Rogue Tower: https://nodal.gg/game/rogue-tower-1843760
- GameAnalytics, tower defense metrics: https://gameanalytics.com/blog/metrics-behind-successful-tower-defense-games/

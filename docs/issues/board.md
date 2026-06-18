# Issue Board — Chikicha

Triage vocabulary: `ready-for-agent` (can be worked), `in-progress`, `done`

| # | Title | Type | Status | Blocked By |
|---|-------|------|--------|------------|
| 1 | Scaffold: project setup & socket handshake | AFK | done | — |
| 2 | Join flow: username entry to lobby | AFK | done | 1 |
| 3 | Ready flow: toggle, countdown, abort | AFK | done | 2 |
| 4 | Game start: deal cards & display hands | AFK | done | 3 |
| 5 | Card selection & drop to central area | AFK | done | 4 |
| 6 | Pass with emote bubble | AFK | done | 4 |
| 7 | Undo mechanic | AFK | done | 5 |
| 8 | Hand arrangement via arrow keys | AFK | done | 4 |
| 9 | Disconnect handling | AFK | done | 4 |
| 10 | Game over: loser reveal & lobby reset | AFK | done | 5, 6 |
| 11 | Spectator flow | AFK | done | 2, 4, 10 |
| 12 | Sound effects | AFK | done | 5, 6, 7, 10 |
| 13 | Visual polish & poker table layout | HITL | done | 1–12 |
| 14 | Pusoy Dos rules & undo removal | AFK | done | 5, 6, 10 |
| 15 | Card ranking + combo utilities | AFK | done | — |
| 16 | Remove undo | AFK | done | — |
| 17 | Server-side Pusoy Dos rules | AFK | done | 15 |
| 18 | Frontend Pusoy Dos UX | AFK | done | 15, 16 |
| 19 | End-to-end play testing | HITL | in-progress | 17, 18 |
| 20 | Player feedback fixes (handbook, queue, turn UX, spectator bug, hide cards, ace rules) | AFK | ready-for-agent | 11, 12, 15, 17 |
| 20a | Fix spectator join kicking active players to lobby | AFK | ready-for-agent | — |
| 20b | Fix Ace/straight rules (wrapping, wheel rank, AA-22 two pair) | AFK | ready-for-agent | — |
| 20c | Remap opponent positions to counter-clockwise turn order | AFK | ready-for-agent | — |
| 20d | Add obvious turn indicators (screen glow, hand lift, banner, chime) | AFK | ready-for-agent | — |
| 20e | Add handbook/rules book modal | AFK | ready-for-agent | — |
| 20f | Add hide-my-cards toggle (button + H key) | AFK | ready-for-agent | — |

## Dependency Graph

```
1 (scaffold)
 └── 2 (join)
      ├── 3 (ready)
      │    └── 4 (deal)
      │         ├── 5 (drop)
      │         │    ├── 7 (undo)
      │         │    └── 10 (game over) ───┐
      │         ├── 6 (pass) ──────────────┤
      │         ├── 8 (arrange)            │
      │         └── 9 (disconnect)         │
      │                                     │
      └── 11 (spectator) ← depends on 2,4,10
      └── 12 (sounds) ← depends on 5,6,7,10
      
 13 (polish) ← depends on all

 14 (pusoy dos PRD) ← depends on 5, 6, 10
   ├── 15 (combo utils) ← foundation, no deps
   ├── 16 (remove undo) ← cleanup, no deps
   ├── 17 (server rules) ← depends on 15
   │    └── 19 (play test) ← depends on 17, 18
   └── 18 (frontend UX) ← depends on 15, 16
```

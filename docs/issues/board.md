# Issue Board — Chikicha

Triage vocabulary: `ready-for-agent` (can be worked), `in-progress`, `done`

| # | Title | Type | Status | Blocked By |
|---|-------|------|--------|------------|
| 1 | Scaffold: project setup & socket handshake | AFK | done | — |
| 2 | Join flow: username entry to lobby | AFK | ready-for-agent | 1 |
| 3 | Ready flow: toggle, countdown, abort | AFK | ready-for-agent | 2 |
| 4 | Game start: deal cards & display hands | AFK | ready-for-agent | 3 |
| 5 | Card selection & drop to central area | AFK | ready-for-agent | 4 |
| 6 | Pass with emote bubble | AFK | ready-for-agent | 4 |
| 7 | Undo mechanic | AFK | ready-for-agent | 5 |
| 8 | Hand arrangement via arrow keys | AFK | ready-for-agent | 4 |
| 9 | Disconnect handling | AFK | ready-for-agent | 4 |
| 10 | Game over: loser reveal & lobby reset | AFK | ready-for-agent | 5, 6 |
| 11 | Spectator flow | AFK | ready-for-agent | 2, 4, 10 |
| 12 | Sound effects | AFK | ready-for-agent | 5, 6, 7, 10 |
| 13 | Visual polish & poker table layout | HITL | ready-for-agent | 1–12 |

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
```

# Issue 1: Scaffold: project setup & socket handshake

## Blocked by

None — can start immediately.

## What to build

Initialize the two-package monorepo structure. Boot the backend with Express + Socket.IO serving on localhost, boot the frontend with Vite + React + Tailwind CSS v4, and prove the two can communicate via a basic Socket.IO connection handshake.

This is infrastructure only — no game logic, no UI beyond a placeholder.

The server must:
- Run Express with `socket.io` attached
- Log when a client connects and disconnects
- Serve on a configurable port (default 3001)

The client must:
- Connect to the server via `socket.io-client`
- Display a "connected" / "disconnected" status indicator
- Use Vite proxy to forward `/socket.io` requests to the backend during dev

Both packages must include vitest for testing.

## Acceptance criteria

- [ ] `chikicha-frontend/` exists with Vite + React + TypeScript + Tailwind CSS v4
- [ ] `chikicha-backend/` exists with Express + Socket.IO + TypeScript
- [ ] Backend starts with `npm run dev` on port 3001
- [ ] Frontend starts with `npm run dev` on port 5173
- [ ] Frontend connects via Socket.IO to backend and shows "Connected" text
- [ ] Backend logs connection events to console
- [ ] Vite dev server proxies `/socket.io` to backend
- [ ] Playing card assets are copied/referenced into the frontend during build
- [ ] Vitest installed in both packages with a trivial smoke test passing

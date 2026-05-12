# The Bridge

Personal 4-week gym + nutrition tracking PWA. Phone-only, single-user, all data local on the device.

## Stack
- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS with rainbow Liquid Glass tokens
- Dexie (IndexedDB) for persistence — offline-first, works in the gym without signal
- Zustand for transient UI state (rest timer, selected day)
- Vitest for unit tests

## Run locally
```bash
# from the monorepo root
npm install
npm run dev --workspace=the-bridge
# open http://localhost:3001
```

## Test
```bash
npm run test --workspace=the-bridge
```

## Deploy to Vercel
1. Push the monorepo to GitHub
2. Import in Vercel
3. Set **Root Directory** to `apps/the-bridge`
4. Framework: Next.js (auto-detected)
5. Build command: `next build`
6. No env vars required

After the first deploy, open the URL on iPhone Safari → Share → Add to Home Screen. The app runs fullscreen with offline-capable storage.

## Data
Everything lives in IndexedDB on the phone. The "More → Backup" tile downloads a JSON snapshot — do this every week or two so a browser-cache wipe doesn't lose the workout history.

## What's implemented
- **Train**: 7-day program (Legs Quad / Push / Pull / Legs Ham-Glute / Upper / Hike / Rest), day pills, exercise cards with form cues + YouTube search links, set logging with weight/reps/RIR, last-session display, PR detection, streak counter, rest timer, plate calculator for barbell lifts, exercise notes
- **Eat**: 4 macro tiles with progress bars, 11 Mediterranean meal presets, manual log, voice log via Web Speech API + regex parser
- **Weigh**: big-number display with deltas, SVG line chart with goal line, history with delete
- **Shop**: 6-section grocery list with checkboxes, custom items, reset
- **More**: supplements check-off, coaching reference (volume ramp, RIR, macros), settings, JSON backup/restore (compatible with v3 prototype backups), iOS install instructions

## Not yet built
- Service worker for full offline (the manifest gets you fullscreen + add-to-home; offline app shell needs a service worker — easy add via `next-pwa` later)
- Workout history aggregate view
- Per-muscle-group volume tracking (validates the 8→16 set ramp)
- Exercise alternates if equipment is taken
- Week-4 review screen
- Local notifications

These are intentional Phase 2 deferrals — see `~/Downloads/build-brief.md` Sprint 8+.

# Local Resolve

A civic reporting application with local and private Firebase workspaces for Coimbatore, Tamil Nadu. The public directory, officer queue and administration analytics share the same demonstration records. Reports and department assignments are fictional.

## Run locally

Use Node.js 24 and npm. From this folder:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To type-check and build the static application, run `npm run build`. Run `npm run preview` to serve the resulting `dist/` directory. A static hosting service should rewrite unknown application paths to `index.html`. No Python service or external login provider is required.

## Demonstration accounts

Choose **Sign In** and then **citizen demo**, **officer demo**, or **admin demo**. For manual sign-in use citizen@demo.local, officer@demo.local or admin@demo.local, the matching role and the shared demo password `LocalDemo123!`. Register with fictional details only. Remember me persists the demonstration session beyond the current tab.

1. As a citizen, report a **Roads and Traffic** issue. The demo officer belongs to the Roads Department. Select a location, attach a JPEG, PNG, WebP, MP4 or WebM file (25 MB maximum per file), review and submit.
2. Copy the report ID and open Track Complaint. Use `LR-2026-000124` to inspect a seeded report.
3. Sign in as the officer, open Assigned Complaints and select the new report. Verify it, move it to In Progress, attach optional resolution evidence and mark it Resolved.
4. Return as the reporting citizen. Review the timeline and either rate and close the complaint or reopen it with a reason.
5. As admin, inspect dashboard totals, charts, report assignments and configuration lists. Admin Settings can restore the original 24 reports and seven announcements.

## Application structure

- `src/App.tsx` defines navigation, lazy routes and role gates.
- `src/pages/` contains the directory, reporting wizard, tracking, accounts, dashboards, analytics and configuration screens.
- `src/components/` contains shared controls, evidence previews, complaint cards and the Leaflet map.
- `src/services/data.ts` uses the interfaces in `src/types/` and defines seed data, the Zustand store, status events, session handling and IndexedDB media access.
- `src/data/project.ts` accepts optional approved project team names.
- `src/index.css` contains responsive layout and shared visual styles. Manrope is bundled locally. The locality bulletin pairs it with system serif headlines. Shared colours, spacing, borders, and responsive bulletin layouts are defined in `src/landing.css`.
- `tests/workflow.spec.ts` exercises the citizen-to-officer-to-admin workflow in Microsoft Edge, including persisted attachments and responsive overflow checks.

## Persistence and integration

LocalStorage holds structured demonstration data and drafts. IndexedDB holds attachment bytes. SessionStorage holds temporary demo sessions. Public complaint views display the issue location, description, history and attachments. Use evidence suitable for public viewing.

For a backend integration, replace the Zustand persistence adapter and client mutations with an authenticated API. Allocate report IDs on the server. Enforce department scope, ownership and permitted status transitions on every write. Commit status history and notifications together with the complaint update. Replace IndexedDB media IDs with validated object-storage references and replace demo login with real server-side sessions. The original Python/SQLite prototype is separate from the React application. Its records are not automatically migrated.

## Scope and verification

Local mode operates in one browser profile. Browser storage can be inspected, edited or cleared. Local mode provides no government routing, emergency response, cross-device synchronization, or email delivery. Cloud mode synchronizes records for its signed-in workspace owner. Map tiles require internet access and remain attributed to OpenStreetMap. Location permission is optional. Manual street and locality entry remains available when map tiles or location access are unavailable.

To repeat browser QA on Windows with Microsoft Edge installed, run `npm run build` followed by `npm test`. Playwright serves the production build on port 4173 and uses an isolated browser profile. The test covers a map-selected report, uploaded evidence after refresh, verification, progress, resolution, feedback, admin totals, and horizontal overflow at 360, 768, 1024 and 1440 pixels.

## Photograph

The homepage shows [A street scene in Coimbatore, Tamil Nadu, India](https://commons.wikimedia.org/wiki/File:A_street_scene_in_Coimbatore,_Tamil_Nadu,_India.jpg) by [Matthew T Rader](https://matthewtrader.com), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The local JPEG is resized and framed with CSS under the same license. It illustrates the locality and is independent of fictional incident evidence.
Verification result: the TypeScript check and Vite production build passed. Edge regression tests passed, including administration CRUD, restricted routes, duplicate confirmation prevention, the complaint lifecycle and responsive layout checks. A full assistive-technology audit is outside this test coverage.

The homepage filters notices, community reports, statistics and map markers by the selected locality. The layout suite visits public, citizen, officer and admin pages at mobile and desktop sizes and checks the locality filter when opening the report directory.

## Firebase backend

Open **Cloud workspace** in the footer, create or sign in to a Firebase Email/Password account, then select a demonstration role in the usual Sign In screen. A cloud account owns a private workspace across devices. Local mode needs no account. Local records are never automatically uploaded. Firebase Analytics is not enabled.

### Connect the live project

The web SDK configuration targets **local-resolve-a9edd**. In Firebase Console, enable Email/Password authentication, create the default Cloud Firestore database and provision the configured Cloud Storage bucket. Configure authorized domains and bucket CORS for the actual frontend origins used for media previews. Billing requirements for Storage depend on the Firebase project plan.

From a Firebase CLI account with access, review the existing rules for both services and merge any rules required by other applications before deployment. For a dedicated project, deploy with:

```sh
firebase deploy --project local-resolve-a9edd --only firestore:rules,storage
```

Firestore rules restrict each privateWorkspaces document to its owner. A revision transaction detects competing edits. A failed write blocks further editing and shows a reload action. Reports and demo configuration share one record capped at 950 KB; evidence is stored separately at workspaceMedia/{uid}/{fileId}. Unlinked attachments require separate retention cleanup. Reset restores workspace records. Drafts are device-local. Demo role switching is available to the workspace owner; public multi-user municipal access would require server-authorized roles and separate record collections.

### Verify without live services

With Firebase CLI and Java 21 installed, run:

```sh
firebase emulators:exec --project demo-local-resolve --only auth,firestore,storage "node tests/firebase-emulator.mjs"
```

For interactive emulator use, start the same services with `firebase emulators:start --project demo-local-resolve --only auth,firestore,storage` and set `VITE_FIREBASE_EMULATORS=true` when starting Vite. Emulator mode uses the demo project ID and loopback endpoints.

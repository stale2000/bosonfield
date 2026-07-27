# Bosonfield MVP

Bosonfield is an original, Higgsfield-inspired creative workspace with a
ComfyUI-shaped backend contract. It covers image, video, audio, projects,
presets, campaigns, community, library, and guided production surfaces.

The default adapter is deliberately dry-run: it validates manifests, queues
deterministic jobs, materializes placeholder assets, and never downloads a
model or starts a GPU. A production ComfyUI worker can be enabled later behind
the same API contracts.

To enable a configured worker, set `COMFYUI_BASE_URL` for local/self-hosted
ComfyUI or the official `COMFY_CLOUD_BASE_URL=https://cloud.comfy.org` for
Comfy Cloud (an explicit `/api` suffix is also accepted), plus the server-only
`COMFYUI_API_KEY` (or `COMFY_CLOUD_API_KEY`) when required. Requests use the
official `/prompt`, `/history`, `/queue`, and `/interrupt` routes; keys are
never returned to the browser. `GET /api/jobs/:id/events` reconciles a
configured job from official `/history/:prompt_id` snapshots (and returns
deterministic adapter events in dry-run mode), without requiring model
downloads or a websocket.
For authenticated Comfy media, completed outputs are served through the
server-side `/api/jobs/:id/output` proxy so private `/view` requests do not
leak the key. Unauthenticated local workers may use direct `/view` URLs.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev -- --port 3001
npm run build
```

The development server is then available at `http://localhost:3001`. If you
run `npm run dev` without the port flag, use the URL printed by Vite (normally
`http://localhost:5173`) and set `BOSONFIELD_URL` to that URL before using the
CLI.

This starter does not use `wrangler.jsonc`.

## Included shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `workflows/manifests/catalog.json` defines the approved workflow surface
- `lib/comfy-adapter.ts` isolates dry-run versus ComfyUI queueing
- `tests/rendered-html.test.mjs` covers the API and rendered shell contracts

The implementation plan, official-first policy, and public UI audit live in
the repository root: `../PLAN.md` and `../HIGGSFIELD_PUBLIC_AUDIT.md`.
`../REPO_BUILD_GRAPH.md` is the typed, gated graph used to generate and verify
the repository itself; it is separate from the product's runtime graph.

### CLI

With the app running, use the same approval-gated MCP contract from a shell:

```bash
npm run cli -- capabilities
npm run cli -- plan image-basic "an orbital field at dusk"
npm run cli -- approve image-basic "an orbital field at dusk"
npm run cli -- job dry_...
```

The CLI also honors `PORT`; set `BOSONFIELD_URL` when the app is on a different
host or URL.

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build Bosonfield and verify the rendered/API contracts
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Sharing Comfy-powered apps

### Showcase MVP

The narrow demo is the Apps directory plus Viral Presets. Start Bosonfield,
open `http://localhost:3001`, choose an app, and paste the real shared-app URL
copied from Comfy Cloud into `Shared Comfy app URL`. Save the link, then use
`Open shared Comfy app` to leave the catalog through the validated redirect.
No model,
GPU, Comfy API key, or local worker is required for this showcase.

The same link can be configured from a shell for a repeatable demo (assuming
the `3001` quick-start port above):

```bash
curl -X PATCH http://localhost:3001/api/apps \
  -H 'content-type: application/json' \
  -d '{"appId":"app_create-image","comfyAppUrl":"https://cloud.comfy.org/..."}'
```

The Apps directory includes a selected-app share bar. `Copy catalog link` creates
a Bosonfield app URL, while `Download workflow` requests the corresponding
ComfyUI API-format graph from `/api/workflows/export?id=<workflow-id>`.
Verified graphs download as executable JSON; candidate manifests return
`WORKFLOW_NOT_READY` until their graph has passed Comfy validation. The MVP
does not expose Comfy credentials in the browser.

MCP capability discovery and approval also include saved Workflow Studio graphs
through the shared workflow store. Approval creates the same dry job record;
raw graph execution remains disabled at the MCP boundary.

The catalog can also point directly at a shared Comfy app without proxying or
hosting it. `GET /api/apps` lists the use-case records and `GET /api/apps/:id`
returns one record with its canonical `catalogPath` and server-side `sharePath`;
the dry admin contract
uses `PATCH /api/apps` with
`{"appId":"app_create-image","comfyAppUrl":"https://..."}`. The Apps
directory opens the validated `/api/share/apps/:id` redirect in a new tab and
disables the action when no link has been configured. Link inputs accept only
credential-free `http(s)` URLs; the browser never receives a Comfy API key.
Server-side handoff helpers at `/api/share/apps/:id` and
`/api/share/presets/:id` redirect only when a link is configured; Bosonfield
never proxies the runtime.

Custom showcase records use the dry admin contract. Create one with
`POST /api/admin/apps` using `title`, `description`, `studio`, `group`, and an
optional credential-free `comfyAppUrl`; it then appears in `GET /api/apps` and
uses the same catalog and external-share paths as built-in apps.

For a deployment-ready catalog, seed links at startup with JSON environment
variables. Keys are catalog IDs and values are credential-free Comfy Cloud (or
other approved Comfy-hosted) URLs:

```bash
BOSONFIELD_COMFY_APP_LINKS='{"app_create-image":"https://cloud.comfy.org/apps/your-app"}'
BOSONFIELD_COMFY_PRESET_LINKS='{"preset_earth-zoom":"https://cloud.comfy.org/shared/your-preset"}'
```

These seed the same server-side maps used by the dry admin editor, so links
survive process restarts when supplied before the app starts or builds.

Viral preset cards are discovery records. `GET /api/presets/:id` returns one
preset record for direct sharing (including its server-side `sharePath`). Add the corresponding Comfy App/Hub
share URL to a preset's optional `comfyAppUrl` field; selecting the card opens
its detail actions, where `Open shared Comfy app` leaves Bosonfield. Bosonfield
does not host or proxy those shared apps; `Dry preview` is only a local
contract check.

Manifest-backed workflow presets use the same `preset_<workflow-id>` records,
catalog paths, and share endpoint. They return a deliberate `409` until a
Comfy-hosted URL is seeded, then use the same validated redirect.

For the dry admin contract, create a custom preset with `POST /api/admin/presets`,
then set its link with `PATCH /api/admin/presets` using
`{"presetId":"preset_dry_...","comfyAppUrl":"https://..."}`. The gallery
reads the unified feed from `GET /api/presets`, which includes custom admin,
viral, and manifest-backed workflow presets.
The same link can be entered from the selected-preset detail panel.

Dry Library assets can be exported as provenance JSON through
`GET /api/assets/:id/download`; this intentionally does not claim to contain
media bytes until persistent object storage is connected.

## Viral preset Cloud-app audit

Every viral preset link is verified in the browser before it is added to the
catalog: open the Cloud share URL in a fresh tab, open the workflow, switch to
App Mode, and confirm that the image control is blank and exposes **Upload**.
Do not publish a workflow that shows an existing image, an image preview, or
an image-load error; clear or rebuild the `Load Image` input first. Record the
Cloud share URL in `lib/local-comfy-app-links.ts`, keep the matching preset key
so the redirect remains verified, and run `npm test` after each link update.

Verified entries: `preset_sticker-peel` →
`https://cloud.comfy.org/?share=8187173ab139`; `preset_float-spin` →
`https://cloud.comfy.org/?share=acff0561888a`; `preset_earth-zoom` →
`https://cloud.comfy.org/?share=ed04a5119f2b`; `preset_ice-statue` →
`https://cloud.comfy.org/?share=b63c2c6a693c`; `preset_sketch-to-fabric` →
`https://cloud.comfy.org/?share=674f97d9c785`; `preset_2000s-paparazzi` →
`https://cloud.comfy.org/?share=ed83dd8b3f43`; `preset_3d-render` →
`https://cloud.comfy.org/?share=b526ac79c0bc`; `preset_action-figure` →
`https://cloud.comfy.org/?share=2fbd48657c9f`; `preset_android-assemble` →
`https://cloud.comfy.org/?share=9afebef4c52a`; `preset_animal-chase` →
`https://cloud.comfy.org/?share=0049ed2a6ae2`; `preset_animal-ride` →
`https://cloud.comfy.org/?share=955252c74034`; `preset_apex-hunter` →
`https://cloud.comfy.org/?share=1d6703698086`; `preset_arena-zero` →
`https://cloud.comfy.org/?share=9355624943cb` (all blank upload fields confirmed).
`preset_baseball-game` → `https://cloud.comfy.org/?share=1ec66504197e` (all blank upload fields confirmed).
`preset_blue-depth` → `https://cloud.comfy.org/?share=2c97c474672b` (all blank upload fields confirmed).
`preset_candid-paparazzi` → `https://cloud.comfy.org/?share=f302c8a489cb` (all blank upload fields confirmed).
`preset_cardboard-cutout` → `https://cloud.comfy.org/?share=b7545154ec6f` (all blank upload fields confirmed).
`preset_cgi-breakdown` → `https://cloud.comfy.org/?share=e8926c97fb11` (all blank upload fields confirmed).
`preset_drown-in-music` → `https://cloud.comfy.org/?share=98154e375396` (all blank upload fields confirmed).
`preset_drift-racing` → `https://cloud.comfy.org/?share=db5626ee92f5` (all blank upload fields confirmed).
`preset_earth-zoom-in` → `https://cloud.comfy.org/?share=8ef42264c123` (all blank upload fields confirmed).
`preset_earth-zoom-out` → `https://cloud.comfy.org/?share=b250a65f3e4d` (all blank upload fields confirmed).
`preset_elevate` → `https://cloud.comfy.org/?share=47cfd283f3d3` (all blank upload fields confirmed).
`preset_fairytale-castle` → `https://cloud.comfy.org/?share=3e36179d9048` (all blank upload fields confirmed).
`preset_casual-monster-slayer` → `https://cloud.comfy.org/?share=b9eed06f1d35` (all blank upload fields confirmed).
`preset_clay-figurine` → `https://cloud.comfy.org/?share=b9babbd26f41` (all blank upload fields confirmed).
`preset_disintegration` → `https://cloud.comfy.org/?share=d44b96d8d2a7` (all blank upload fields confirmed).

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

Fix procedure used for Earth Zoom and Selfie Twin: MCP app_get confirmed node 9 image input and node 27 video output; imported a clean frontend graph with no image asset; App Builder selected the LoadImage input checkbox and terminal output; saved a named app; created a fresh public share; opened it in a fresh browser tab, clicked Open workflow, and verified App Mode showed Select image... / Upload with no selected image.

Cloud-app audit: preset_selfie-twin → https://cloud.comfy.org/?share=51d1efd0eb02; preset_moonwalk → https://cloud.comfy.org/?share=08ab36dddcae (App Mode, blank upload verified).

Cloud-app audit: preset_face-punch → https://cloud.comfy.org/?share=985efa15d619 (App Mode, blank upload verified).

Cloud-app audit: preset_orbit-360 → 5177ec0f2ea, preset_mighty-fighter → 648ff05a6a61, preset_orbital-presence → 26b1c9b1485b, preset_football-invader → 30634ec2a8f2, preset_summer-haze → 81dc2797f9ff (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_kung-fu-hit → 22007e3aee2, preset_storm-giant → 9bd0a14cb9ed, preset_zombie-dance → 34fc2a7425a7, preset_golf-major → bcc2039c7de, preset_race-track → 9780bc40896f (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_nightline → 2e09ccf2eab0, preset_free-fall → 21b8e1dd6a4, preset_red-carpet → e7ebbfc8f5d, preset_neon-city → d48ae6551bb7, preset_soul-fighter → 95d61449a1b (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_tuscan-yoga → 1b51c0732a6e, preset_in-the-dark → 1f7fadc3ab42, preset_red-thread → 28a983a2a19d, preset_exit-the-dream → 5b41e56578c5, preset_ending-fairy → 7d52a73671a4 (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_dragon-fantasy → b6b89f805c2, preset_fan-meeting → 37ab010cccaa, preset_magic-spell → 8be962fbc5df, preset_me-and-pet-transformation → 1519ef437d22, preset_night-vision → e4dc6c4f236 (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_office-cctv → 9567e64d1c3, preset_race-winner → 6988a3ab5769, preset_still-world → 4d7f6afa0d2f, preset_superfast-flight →  ca986c08d83 (fresh shares verified in App Mode with blank uploads).

Cloud-app audit: preset_sword-and-sorcery → 4e3df24c70bc (fresh share verified in App Mode with blank upload).

Cloud-app audit: preset_wrestle → 631249057def (fresh share verified in App Mode with blank upload).

Cloud-app audit: preset_final-serve → 8b8abcbd9eea (replaced missing MCP app with a clean graph; fresh share verified in App Mode with blank upload).

Final browser audit (2026-07-26): 62/62 viral cards clicked successfully; 62/62 redirects returned public https://cloud.comfy.org/?share= URLs; all 62 fresh shares opened in App Mode with Select image... and Upload, with no private image selected.

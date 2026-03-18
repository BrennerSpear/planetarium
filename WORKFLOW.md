---
tracker:
  kind: linear
  project_slug: "8c3ba9027a7a"
  active_states:
    - Todo
    - In Progress
    - Merging
    - Rework
  terminal_states:
    - Canceled
    - Duplicate
    - Done
server:
  port: 4041
polling:
  interval_ms: 5000
workspace:
  root: ~/symphony-workspaces/planetarium
hooks:
  after_create: |
    git clone --depth 1 git@github.com:BrennerSpear/planetarium.git .
    bun install
  before_remove: |
    true
agent:
  max_concurrent_agents: 3
  max_turns: 30
codex:
  command: codex --config shell_environment_policy.inherit=all --config model_reasoning_effort=xhigh --model gpt-5.4 app-server
  approval_policy: never
  thread_sandbox: danger-full-access
  turn_sandbox_policy:
    type: dangerFullAccess
---
You are working on a Linear ticket `{{ issue.identifier }}` in the **Planetarium** project.

{% if attempt %}
Continuation context:

- This is retry attempt #{{ attempt }} because the ticket is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed investigation or validation unless needed for new code changes.
- Do not end the turn while the issue remains in an active state unless you are blocked by missing required permissions/secrets.
{% endif %}

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Instructions:

1. This is an unattended orchestration session. Never ask a human to perform follow-up actions.
2. Only stop early for a true blocker (missing required auth/permissions/secrets). If blocked, record it in the workpad and move the issue according to workflow.
3. Final message must report completed actions and blockers only. Do not include "next steps for user".

Work only in the provided repository copy. Do not touch any other path.

## Project: Planetarium

Planetarium is an interactive 3D visualization showing the planetary alignment of May 19, 2161, when all planets gather on one side of the Sun.

- **Stack:** Bun + Vite + Three.js
- **Goal:** A single-page web app where users can:
  - See all 8 planets (+ Pluto) positioned at their approximate May 2161 locations
  - Planets rendered to-scale relative to each other (with optional distance scaling for visibility)
  - A visible path/line connecting all planets to show alignment
  - Full 3D camera controls (orbit, zoom, pan) via OrbitControls
  - Distance labels between planets
  - Planet labels and basic info on hover/click
  - A toggle between "true scale" and "visible scale" modes

### Planetary Data

Use JPL approximate Keplerian orbital elements for the J2000 epoch (valid 3000 BC – 3000 AD):
Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html

For May 19, 2161:
- Julian Date: ~2,514,166.5
- Compute each planet's mean anomaly, eccentric anomaly (Kepler's equation), then heliocentric coordinates
- Apply orbital elements (a, e, I, L, ω̄, Ω) and their rates

The math should be implemented in the codebase — compute positions from orbital elements, don't hardcode XYZ coordinates.

### Key Technical Requirements

- Three.js for 3D rendering
- OrbitControls for camera interaction
- Realistic planet textures (use free NASA/solar system textures or procedural)
- Proper lighting (Sun as point light source at origin)
- Responsive canvas (full viewport)
- Info panel showing planet data on selection
- A "spine line" connecting all planets to visualize alignment quality
- Distance markers between adjacent planets along the spine
- Smooth animations for transitions between view modes

### Key files and directories

- `src/` — TypeScript source
- `src/main.ts` — app entrypoint
- `src/scene.ts` — Three.js scene setup
- `src/planets.ts` — planet data, orbital mechanics, rendering
- `src/controls.ts` — camera controls and UI
- `src/ui/` — HTML overlay UI components
- `public/` — static assets (textures)
- `index.html` — entry HTML
- `vite.config.ts` — Vite config

### Running / Testing

```bash
bun install
bun run dev          # dev server with HMR
bun run build        # production build
bun x tsc --noEmit   # typecheck
```

### Testing Requirements (CRITICAL)

**Every ticket MUST include deterministic end-to-end testing.** This is a visual/frontend project, so:

1. **Playwright tests** — each ticket must have Playwright test(s) that:
   - Launch the dev server
   - Navigate to the page
   - Wait for the 3D scene to fully render
   - Take screenshots and compare against baselines (or validate DOM state)
   - Interact with the UI (click planets, toggle modes, zoom/pan)
   - Assert expected behavior (planet count, labels visible, distances shown, etc.)

2. **Tests must be 100% deterministic** — no Math.random(), no race conditions:
   - Fix camera position/rotation for screenshot tests
   - Disable animations during test mode
   - Use fixed viewport sizes
   - Seed any random values

3. **Test commands:**
   ```bash
   bun run test           # run Playwright tests
   bun run test:update    # update screenshot baselines
   ```

4. **No ticket is "Done" without passing tests.**

### Deploying

Do NOT deploy. Symphony agents should only write code, tests, and open PRs.

## Status map

- `Backlog` → out of scope; do not modify.
- `Todo` → queued; immediately transition to `In Progress` before active work.
  - Special case: if a PR is already attached, treat as feedback/rework loop.
- `In Progress` → implementation actively underway.
- `Axel Review` → PR is attached and validated; waiting on Axel (AI reviewer) approval.
- `Merging` → approved by Axel; rebase, merge the PR, then move to Done.
- `Rework` → Axel requested changes; fresh branch, fresh plan.
- `Done` → terminal state; no further action.

## Step 0: Route by current state

1. Fetch the issue by ticket ID.
2. Read the current state and route:
   - `Backlog` → stop; wait for human.
   - `Todo` → move to `In Progress`, create workpad, start execution.
   - `In Progress` → continue from existing workpad.
   - `Axel Review` → poll for review updates.
   - `Merging` → rebase onto main, merge PR, move to Done.
   - `Rework` → close old PR, fresh branch from main, restart.
   - `Done` → shut down.
3. If a branch PR exists and is CLOSED/MERGED, create fresh branch from `origin/main`.

## Step 1: Planning (Todo → In Progress)

1. Find or create a single `## Codex Workpad` comment on the issue.
2. Write a hierarchical plan with acceptance criteria and TODOs.
3. Include environment stamp: `<host>:<abs-workdir>@<short-sha>`
4. Run `git pull origin main` to sync before any code edits.
5. Capture reproduction signal before implementing.

## Step 2: Execution (In Progress → Human Review)

1. Implement against the plan, keeping the workpad comment current.
2. Check off completed items, add discovered items.
3. Run `bun x tsc --noEmit` — must pass.
4. Run `bun run test` — Playwright tests must pass.
5. Commit logical, clean commits. Push to feature branch.
6. Open PR with `symphony` label targeting `main`.
7. Run PR feedback sweep (address all reviewer comments).
8. Confirm tests pass on latest push.
9. Move to `Axel Review` only when all criteria are met.

## Step 3: Axel Review → Merging → Done

1. In `Axel Review`: do not modify code. Poll for review.
2. If changes requested: move to `Rework`.
3. If approved and moved to `Merging`: rebase, merge, move to `Done`.

# Huddle

A configurable work-management prototype built around the way teams actually operate.

> **The work board is the source of truth. The Huddle is a guided view over it — one meeting between heads of department, walking department by department through what cannot proceed and what nobody has started.**

Frontend-only prototype. Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix primitives, zustand.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Any credentials sign you in as Sai Charan. There is no server — see [Prototype boundaries](#prototype-boundaries).

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the React compiler rules |
| `npm test` | Engine unit tests (Vitest) |
| `npm run verify:golden` | Browser walk of the golden path — needs `npm run dev` running and `npx playwright install chromium` once |

---

## The demo script

Twenty steps, about eight minutes. This is the flow the prototype is built to make convincing.

**Setup.** Open `/login`, sign in. You land on the dashboard as Sai Charan, Engineering Lead at Acme Corp.

1. **The dashboard leads with problems, not metrics.** The four counters are quiet; *Attention required* is not. Note that Blockers is the only tile with colour.
2. **Look at the Leadership huddle panel.** One row per department, each showing its head and what they are carrying — blockers and backlog. This is the agenda before anyone walks into the room.
3. **Sidebar → Engineering → Board.** Scan the columns: Backlog, Ready, In Development, Code Review, QA, Done. **There is no "Blocked" column.** Blocked work sits in the status it is genuinely in, wearing a badge — status says *where* the work is, blocked says *whether it can proceed*.
4. **Open `ENG-124 Payment API`.** The drawer shows `Blocked`, "Waiting for ENG-120 Finance credentials", and a checklist at 3 of 5. Scroll: the body is chunked into Work, Schedule, Classification, Description, Progress, Blockers, Relationships, Custom fields, Comments, Activity.
5. **Look at Relationships.** ENG-124 is *waiting for* ENG-120 and *holding up* ENG-131. The same relationship, visible from both sides, stored once.
6. **Edit inline, and create properly.** Change a card's status or assignee straight from the board — no modal. Then **New work item** for the full form when you already know what the work is.
7. **The toolbar is five controls**: `Filter · Group · Sort · View · ⋯`. Filter → Blocked. Group → Assignee. Then Filter → Clear. *Advanced filter…* builds `(A AND B) OR C` — the simple picker and the builder write into the same tree.
8. **Switch views.** Board → List → Table → Calendar → Timeline. Your filter, grouping and sort survive the move. On Timeline, follow the red arrows down the payment chain: ENG-120 → ENG-124 → ENG-131 → ENG-140.

**The scorecard.** Every department measures different things, which is why the platform measures none of them itself.

9. **Sidebar → Sales → Scorecard.** The Critical Number for the quarter, this quarter's Rocks, then the grid: rows are metrics, columns are days. Sales counts leads and deals; switch to **Marketing** and the same screen is spend, MQLs and cost per lead. Nothing about either department is in the code — a metric is a record, defined in Settings → Metrics & KPIs.
10. **Type into today's cell.** Click a `New leads` cell, type a number, press Enter — it moves *down*, the way a spreadsheet does. Watch `Lead → won %` recompute in the same frame: it is a ratio of two other metrics, derived on read, so it can never drift from the counts it is made of.
11. **Paste a block from Excel.** Select a range in a spreadsheet and paste it into the grid — it fills down and right from the focused cell. This is the migration path, and the reason anyone would leave the sheet.
12. **Note the empty cells.** A blank renders as `—`, never `0`. "Nobody reported" and "it was nothing" are different facts, and a scorecard that confuses them stops being believed in its second week.
13. **Settings → Metrics & KPIs.** Add the **Marketing** library to a department in one click — six metrics arrive, including *Cost per lead* already wired to Spend ÷ MQLs. A blank "create a metric" form is a wall; the hard part was never the tool.

**The huddle.** It lives in the sidebar, not inside a department — there is one, and it is between heads of department.

14. **Huddle → Start the leadership huddle.** Attendance lists all four departments, each with its head. Click **Sales** to mark it absent — 3 / 4. Start.
15. **Engineering is reviewed first, spoken for by Sai.** Four things are on screen and nothing else: **Numbers**, each with its target beside it and the Critical Number's pace against the quarter; **Blocked**, every one of them; and **Not started**, capped. Blockers are never capped — there are few and each is a real problem. Backlog is, because Engineering carries twenty-six untouched items and reading them all out would bury the three that matter. Click *Show all 26*, then *Show top few*.

    Rows are one line until you click one. A room discusses one thing at a time, so only the open row carries its blocker detail and the controls for status, assignee and due date.
16. **Each row says why it is there**, once — blocked work names what it is waiting for, which names the person who can unblock it. Note that *overdue alone does not put an item on the agenda* — a late in-progress item is something the head already knows about; an untouched backlog item is exactly what never gets raised unless a meeting raises it.
17. **Capture the discussion.** On `ENG-124`, fill in *Why is it stuck?* and *Decision*, then add an action — "Follow up with Finance at 2pm", owner Sai, due Today.
18. **The moment.** In the discussion panel's Dependencies section, click **ENG-120**. In the drawer that opens, set its status to **Done**. Close the drawer.

    ENG-124 flips to **Unblocked** in place. The dependency panel re-labels itself "Was waiting for". Engineering's blocker count drops. Nothing was refreshed and no flag was set anywhere — `isBlocked` is derived, so the whole product re-reads the same truth.

19. **Next → Product.** Aditya's turn. Note `PRD-30 Usage-based billing spec` is blocked by **ENG-120** — the same item Engineering just resolved. Cross-department waiting is the single most useful thing a leadership meeting surfaces. Keep clicking Next to reach **Finish**.
20. **The summary** leads with actions grouped by owner, then decisions, then every item changed during the huddle. **Complete huddle** returns you to the dashboard — where all of it already is. Nothing was transcribed.

**Afterwards.** Settings → Audit logs shows every change from steps 6–19 — including who changed which day's number, and what it was before. Refresh the page: it all survives.

**The CRUD round-trip**, worth showing separately:

- Settings → Members → **Add** an employee, with departments and colour.
- Settings → Departments → make them **head** of a department, or toggle their membership.
- Huddle → they now appear in the roster, speaking for that department.
- Settings → Members → remove them. The confirmation **names what happens to their work** before it happens, and lets you hand it to someone else rather than silently orphaning it.

Also worth showing: `⌘K` (search and commands in one surface), `⌘\` to collapse the sidebar to an icon rail when a board or the scorecard grid wants the width, and the theme toggle under your avatar.

## Architecture

Three ideas carry the whole application.

### 1. Blocked is derived, never stored

```ts
isBlocked(item) =
  activeBlockers(item).length > 0          // a human said so
  || blockingEdges(item).length > 0        // an unfinished dependency
```

Nothing anywhere holds a blocked flag. That is why step 13 works with no invalidation logic: set the blocker to Done, and every dependent re-derives on the next read — on the board, in the drawer, in the huddle, on the dashboard, in search.

This is also why there is no Blocked column and no Blocked status. **Status = where the work is. Blocked = whether it can proceed.** They are different questions and the model keeps them apart.

### 2. The huddle ranks by one rule the whole product shares

`attentionOf` decides what matters, and the huddle, the dashboard's "Attention required", the department overview and `/blocked` all read it — so "the most important thing" means one thing everywhere.

The meeting is between heads of department, and what it exists for is **work that cannot proceed, and work nobody has started**. So exactly two signals qualify:

```
needsDiscussion = blocked || backlog
```

Overdue and due-today deliberately do *not* qualify on their own; they still show on rows and still raise the score. Neither does "holding up other work" — if ENG-124 is blocked by ENG-120, listing both makes the room discuss one dependency twice, and the blocked row already names what it waits for.

Scoring is tiered, with modifiers sized so no combination can lift an item into the tier above:

| Signal | Score |
|---|---|
| Blocked | 1000 |
| Holding up other work | 600 (+8 per downstream item, 5 counted) |
| In a backlog status | 300 |
| *modifier* overdue | +150 |
| *modifier* due today | +80 |
| *modifier* priority | +0…60 |

One consequence worth knowing: `backlog` is excluded from board-card badges. Every card in every Backlog column wearing a badge would turn the loudest signal in the product into wallpaper — the column already says it.

### 3. One pipeline, every view

```
WorkItem[] → filter(FilterNode) → sort(SortRule[]) → group(GroupKey) → render
```

Board, List, Table, Calendar, Timeline and the Huddle all consume this. Only the final render step differs. `WorkspaceFrame` runs it once per department and hands the result to a renderer, which is what makes "all views operate on the same work item model" structurally true rather than a claim.

Filters are a tree, so `(Status = Doing AND Priority = High) OR Blocked = true` is expressible; the simple picker writes a flat AND group into the same structure, so there is one evaluator and the two can never disagree.

### 4. A metric is data, not code

Every department here tracked its numbers in its own spreadsheet, because sales, marketing and engineering measure genuinely different things — which is exactly why any fixed set of columns is wrong for three departments out of four.

So a KPI gets the same treatment statuses, labels and custom fields already get: a `Metric` is a department-scoped *definition* (unit, cadence, direction, target, owner) and a `MetricEntry` is a value at `(metric, department, period)`. The platform never learns what a conversion is.

```
metric definitions  ->  the spreadsheet's rows
periods             ->  its columns
entries             ->  its cells
```

Three things follow that a spreadsheet cannot do:

- **`direction` decides everything.** "Incidents, target 0, lower is better" and "Deploys, target 3, higher is better" resolve through one function, so no component branches on what a metric means.
- **Computed metrics are derived on read.** A conversion rate is `ratio(won, leads)` — never stored, so it cannot drift from the counts it is made of. Presets (ratio, sum, difference) rather than a formula language: typed, safe, nothing to parse, and enough for what an operating scorecard actually needs.
- **Every edit is audited**, because entries are written through the same `apply` primitive as everything else. "Who changed last month's figure, and what was it before" has an answer.

An empty cell is `not-reported`, never zero, and never red. Reporting a genuine nought and forgetting to report are different facts, and conflating them is how a scorecard loses trust.

Cadence is per metric, so `lib/engine/periods.ts` owns period arithmetic and nothing else may construct a `periodStart` — that one rule is what stops a weekly metric collecting seven entries in a week.

### 5. Visual consistency is structural

No component renders a status, priority, label or blocked state with its own markup. They all come from `components/primitives/`. `<BlockedBadge>` is the *only* way anything draws "blocked", so the board, list, table, timeline, huddle, dashboard and command palette cannot drift apart.

Colour resolves through CSS custom properties rather than Tailwind class names, because hue and status category are runtime values — `bg-${hue}-100` cannot be generated by Tailwind's scanner. The whole palette lives in `app/globals.css` and light/dark are defined together.

Statuses are user-configurable but their **category** is not. Icon and colour come from the category, so fifty custom statuses stay coherent without anyone choosing colours.

### Data and mutations

Every entity is a normalized `id → entity` map. Derived values — `isBlocked`, checklist progress, overdue, huddle counts — are computed on read in `lib/engine/derive.ts` and never persisted.

All mutations go through one primitive:

```ts
useStore.getState().apply((state) => {
  state.entities.workItems[id].statusId = next
  return { kind: 'work-item', entityId: id, summary: `moved ${key} to ${name}` }
})
```

The recipe reports what it did and `apply` turns that into an audit event. Audit coverage is complete by construction rather than by remembering to log at each call site. The UI never calls `set` directly — it calls services in `lib/services/`.

### Layout

```
app/
  (auth)/login/
  (app)/
    dashboard/  my-work/  blocked/  calendar/  reports/  audit-logs/
    huddle/  huddle/history/
    departments/[departmentId]/{overview,board,list,table,calendar,timeline,scorecard,members}/
    settings/{organization,departments,members,roles,workflows,labels,
              work-item-types,custom-fields,metrics,views,huddles,audit-logs}/
lib/
  types/      24 entities
  engine/     filter · sort · group · derive · periods · metrics · pipeline   (pure, unit-tested)
  services/   the mutation API the UI calls
  store/      zustand + immer + persist, and selectors
  data/seed/  the demo dataset, and the metric template library
components/
  primitives/  the shared visual language
  shared/      pagination
  layout/  workspace/  work/  views/  huddle/  metrics/  settings/  ui/
```

---

## Prototype boundaries

Stated plainly rather than left to be discovered:

- **No backend and no authentication.** Login is a façade; any credentials work. Everything lives in this browser's `localStorage`.
- **RBAC is configurable but not enforced.** The permission matrix is real, editable and persisted — it does not gate the interface. Gating a prototype's own features makes it harder to demo the thing it exists to demonstrate.
- **No automation or workflow-rule engine.** Deliberately out of scope; a normal user should never need to reach that layer.
- **Comments are local and un-threaded**, and reports are a small set of real numbers computed live rather than an analytics product.
- **Organization switching** changes the active org, but only Acme Corp is seeded with work.
- **There is no per-department huddle.** One organization-wide meeting between heads of department, configured in Settings → Huddles.

### Seed data

Built relative to "now", so overdue work is genuinely overdue whenever you open it, and deterministic, so *Reset demo data* restores an identical board.

Four departments on four genuinely different workflows, each with a head: Sai (Engineering), Aditya (Product), Rohan (Marketing), Manish (Sales).

Every department carries at least one genuine blocker and a real backlog, because a leadership huddle where three of four heads have nothing to say is a seeding accident rather than a product statement — a test asserts it. Several blockers are deliberately **cross-departmental**: `PRD-30` and `SLS-190` wait on Engineering, which is what makes the meeting worth holding. The payments chain `ENG-120 → ENG-124 → ENG-131 → ENG-140` is what step 13 unwinds.

Each department also carries a scorecard: around six metrics apiece with sixty days of daily history, plus a Critical Number and three Rocks for the current quarter. Product's interview count is deliberately left unreported for today, so the huddle demo has a department visibly behind on its numbers. Computed metrics are never seeded — a ratio is derived on read, and storing one would be the exact drift the design exists to prevent.

> A note on keys: the PRD writes the payments work as both `ENG-124` (§13's card) and `PAY-124` (§23's chain). Keys here are prefixed per department, so it is `ENG-124` throughout — same item, one prefix.

---

## Testing

`npm test` covers the engine — the part everything else depends on:

- `isBlocked` from both dependencies and manual blockers, and that a resolved blocker stops counting
- the unblocking cascade, and that it does **not** leak further down the chain
- that no seeded status is named "Blocked"
- inverse relations derived without a mirrored row
- nested `(A AND B) OR C` evaluation
- multi-level sort, including undated work staying last in *both* directions
- group bucketing: empty board columns kept, empty list groups dropped
- period canonicalisation across cadences, including the Sunday that belongs to the week before and the quarter boundary
- `metricHealth` symmetry under `direction`: target 0 / lower-is-better reads green at 0 and red at 3
- that an unreported period is `not-reported` and a reported 0 is not
- computed metrics: a ratio resolving, a zero denominator returning nothing rather than infinity, a partial sum refusing rather than under-reporting
- a metric that depends on itself — directly or through another metric — returning null instead of hanging
- the ranking rules: a backlog item qualifies for discussion; an overdue in-progress item does not qualify on its own; a blocker outranks any backlog item; no modifier can lift an item into the tier above
- that `backlog` never reaches a board card's badges
- that the backlog cap holds while blockers are never capped
- that every department has something to bring to the huddle

`npm run verify:golden` drives a real browser through the huddle flow and asserts the moments that matter: 3/4 departments present, the capped backlog and its expander, and the step-13 cascade where marking ENG-120 Done flips ENG-124 to Unblocked in place.

---

## Deploying

Vercel auto-detects the framework. No environment variables are needed — the app is entirely client-state.

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Next.js**. Build `next build`, install `npm ci`.
3. Deploy.

Or from a machine with a Vercel token: `npx vercel deploy --prod`.

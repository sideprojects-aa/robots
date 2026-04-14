# Robbie &amp; Pals — present-delivery simulation

A small Vue 3 + TypeScript app that runs the Robbie-the-Robot simulation from the exercise brief. Multiple robots take turns walking an infinite grid and delivering presents to the houses they land on.

**Live demo:** https://sideprojects-aa.github.io/robots/

## Prerequisites

- Node.js 20+ (pinned via `.nvmrc`; tested on Node 24)
- npm

## Running

```sh
npm install
npm run dev        # local dev server (Vite) — http://127.0.0.1:5174 (or next free)
npm run build      # type-check + production build
npm run preview    # serve the production build locally
npm test           # run the vitest unit + component tests
npm run lint       # eslint — fails on warnings (max-warnings=0)
npm run lint:fix   # eslint with auto-fix
```

## Things to try

Start the app and press **Start** with the defaults (3 robots, `^^VV<>`) — this is the example from the brief. Use **Step** to watch one robot move per turn, or **Run to end** to complete the sequence.

The grid view shades each delivered-to house by its present count and positions robots on the grid. Robots that share a cell fan out so they stay legible.

The stats panel exposes the simulation query API:

- total presents delivered
- number of unique houses
- number of houses with at least **n** presents (editable)
- current `(x, y)` for each robot

## Project layout

```
src/
├── App.vue                       # top-level — owns the Simulation instance
├── components/
│   ├── ControlPanel.vue          # setup + step/run/reset buttons
│   ├── StatsPanel.vue            # queries the simulation
│   └── GridView.vue              # SVG visualisation of houses + robots
├── simulation/
│   ├── Simulation.ts             # pure TypeScript core — no Vue
│   └── Simulation.test.ts        # vitest coverage of the rules
├── utils/palette.ts              # shared robot colours
├── main.ts
└── styles.css
```

The simulation core is deliberately framework-free so it's trivial to test in isolation and would drop into any other host (CLI, worker, different UI).

## The simulation API

```ts
import { Simulation } from './simulation/Simulation'

// numRobots defaults to 1, moves defaults to '' (both params optional)
const sim = new Simulation(3, '^^VV<>')
sim.step()                    // advance one instruction; returns false when done
sim.run()                     // run the remaining sequence
sim.getPositions()            // Position[] — one per robot
sim.totalPresentsDelivered    // number
sim.housesWithAtLeast(1)      // number of houses with >= n presents
sim.getHouses()               // ReadonlyMap<"x,y", count>
sim.isComplete                // boolean
sim.currentTurn               // 0-indexed turn counter
sim.nextRobotIndex            // which robot moves next, or null if complete
```

## Rules, as implemented

- Universe is an infinite 2-D integer grid with origin `(0, 0)`. All robots start at the origin.
- Instructions dispatch round-robin: turn `i` belongs to robot `i % numRobots`. For the brief's example (3 robots, `^^VV<>`) that's `robbie:^, jane:^, bob:V, robbie:V, jane:<, bob:>`.
- Moves: `^` = +y, `V` = −y, `<` = −x, `>` = +x. Invalid characters are rejected at construction so bad input fails fast.
- A robot delivers exactly one present if, after its move, no other robot shares the ending cell. Presents stack — a house visited three times by a lone robot has three presents.
- The origin is *not* pre-seeded with a present; the first delivery happens when a robot first ends a turn alone somewhere.
- `housesWithAtLeast(n)` requires `n >= 1` (per spec); non-positive or non-integer `n` throws.

## Design notes / trade-offs

- **Framework separation.** The Simulation class is a plain TS class — no Vue imports. Vue holds it in a `shallowRef` and calls `triggerRef()` after `step()`/`run()` so the UI reacts without forcing deep reactivity onto a data structure (the `Map` of houses) that's mutated in-place every turn. This keeps the core fast and the reactivity explicit.
- **Houses as `Map<"x,y", count>`.** The grid is unbounded, so a dense array is out. A string-keyed map is the simplest correct representation and keeps `housesWithAtLeast(n)` as an `O(houses)` scan, which is what the spec asks for.
- **O(R) alone-check.** Checking "is this robot alone on the ending cell" is linear in the number of robots. For the expected sizes that's fine; if the robot count ever got large you'd maintain an occupancy map keyed by cell and update it on each move.
- **Validation at boundaries.** Input is validated in the constructor and in `housesWithAtLeast`; the internal `step()` trusts itself. This matches the "only validate at boundaries" convention.
- **UI is a view, not a driver.** The components only display and emit events; App.vue wires them to the Simulation. Swap in a different UI (or none) without touching the core.

## Tests

```sh
npm test
```

36 tests across four files:

- `src/simulation/Simulation.test.ts` — rule coverage for construction, round-robin dispatch, alone-on-cell delivery, revisits, house queries, `getHouses()` shape, `run()` vs manual stepping parity, mid-simulation state, and the rebuild-and-step pattern the scrub slider relies on.
- `src/components/ControlPanel.test.ts` — renames, adds, and removes robots; emits the right events; disables inputs while running; toggles Start ↔ Step/Run/Reset.
- `src/components/StatsPanel.test.ts` — renders snapshot data, highlights the next-to-move robot, emits `scrub` on slider drag, and computes `housesWithAtLeast(n)` in response to the number input.
- `src/components/GridView.test.ts` — shows the empty state, renders one circle/rect per robot/house, lists names in the legend, updates the HUD on wheel zoom, and snaps back to defaults on Recenter.

## Linting

```sh
npm run lint
```

ESLint with `eslint-plugin-vue` + `typescript-eslint` (flat config in `eslint.config.js`), set to fail the build on warnings.

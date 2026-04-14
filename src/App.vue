<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Simulation } from './simulation/Simulation'
import type { SimulationSnapshot } from './simulation/types'
import ControlPanel from './components/ControlPanel.vue'
import StatsPanel from './components/StatsPanel.vue'
import GridView from './components/GridView.vue'

const STEP_INTERVAL_MS = 100
const DEFAULT_NAMES = ['robbie', 'jane', 'bob']
const NAME_SUGGESTIONS = ['robbie', 'jane', 'bob', 'ada', 'leo', 'mia', 'ken', 'yuki']

const robotNames = ref<string[]>([...DEFAULT_NAMES])
const moves = ref('^^VV<>')
const error = ref<string | null>(null)

const numRobots = computed(() => robotNames.value.length)

let sim: Simulation | null = null
const tick = ref(0)

const isRunning = computed(() => {
  tick.value
  return sim !== null
})
const isComplete = computed(() => {
  tick.value
  return sim?.isComplete ?? false
})

function nameFor(index: number, existing: string[]): string {
  const base = NAME_SUGGESTIONS[index] ?? `robot ${index + 1}`
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

const snapshot = computed<SimulationSnapshot | null>(() => {
  tick.value
  if (!sim) return null
  return {
    positions: sim.getPositions(),
    names: robotNames.value.slice(0, sim.numRobots),
    totalPresents: sim.totalPresentsDelivered,
    houses: sim.getHouses(),
    currentTurn: sim.currentTurn,
    totalTurns: sim.moves.length,
    nextRobot: sim.nextRobotIndex,
  }
})

const stateLabel = computed(() => {
  if (!snapshot.value) return 'idle'
  if (snapshot.value.currentTurn >= snapshot.value.totalTurns) return 'complete'
  return 'running'
})

const stateClass = computed(() => `state-${stateLabel.value}`)

let runTimer: ReturnType<typeof setTimeout> | null = null
const isAutoRunning = ref(false)

function stopAutoRun() {
  if (runTimer !== null) {
    clearTimeout(runTimer)
    runTimer = null
  }
  isAutoRunning.value = false
}

function start() {
  stopAutoRun()
  try {
    sim = new Simulation(numRobots.value, moves.value)
    error.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    sim = null
  }
  tick.value += 1
}

function jumpTo(turn: number) {
  if (!sim) return
  stopAutoRun()
  const target = Math.max(0, Math.min(sim.moves.length, Math.round(turn)))
  // Simulation is forward-only; rebuild from scratch and fast-forward to target.
  const fresh = new Simulation(sim.numRobots, sim.moves)
  for (let i = 0; i < target; i += 1) fresh.step()
  sim = fresh
  tick.value += 1
}

function addRobot() {
  robotNames.value = [...robotNames.value, nameFor(robotNames.value.length, robotNames.value)]
}
function removeRobot(index: number) {
  if (robotNames.value.length <= 1) return
  robotNames.value = robotNames.value.filter((_, i) => i !== index)
}
function renameRobot(index: number, name: string) {
  const next = [...robotNames.value]
  next[index] = name
  robotNames.value = next
}

function reset() {
  stopAutoRun()
  sim = null
  error.value = null
  tick.value += 1
}

function step() {
  if (!sim || isAutoRunning.value) return
  sim.step()
  tick.value += 1
}

function runAll() {
  if (!sim || isAutoRunning.value) return
  isAutoRunning.value = true
  const tickAndSchedule = () => {
    if (!sim || sim.isComplete) {
      stopAutoRun()
      return
    }
    sim.step()
    tick.value += 1
    runTimer = setTimeout(tickAndSchedule, STEP_INTERVAL_MS)
  }
  tickAndSchedule()
}

onBeforeUnmount(stopAutoRun)
</script>

<template>
  <div class="app">
    <nav class="topbar">
      <div class="brand">
        <span class="brand-dot" aria-hidden />
        <span class="brand-name">robbie</span>
        <span class="brand-sep" aria-hidden>/</span>
        <span class="brand-sub">present-delivery sim</span>
      </div>
      <div class="nav-meta">
        <span class="pill" :class="stateClass">
          <span class="pill-dot" aria-hidden></span>
          {{ stateLabel }}
        </span>
      </div>
    </nav>

    <header class="page-head">
      <div class="head-text">
        <h1>Simulation</h1>
        <p class="subtitle">Robots take turns walking an infinite grid and delivering to houses they land on alone.</p>
      </div>
      <dl class="metrics">
        <div class="metric">
          <dt>turn</dt>
          <dd>{{ snapshot ? `${snapshot.currentTurn}/${snapshot.totalTurns}` : '—' }}</dd>
        </div>
        <div class="metric">
          <dt>robots</dt>
          <dd>{{ numRobots }}</dd>
        </div>
        <div class="metric">
          <dt>delivered</dt>
          <dd>{{ snapshot?.totalPresents ?? 0 }}</dd>
        </div>
        <div class="metric">
          <dt>houses</dt>
          <dd>{{ snapshot?.houses.length ?? 0 }}</dd>
        </div>
      </dl>
    </header>

    <section class="workspace">
      <div class="col-left">
        <ControlPanel
          :robot-names="robotNames"
          v-model:moves="moves"
          :is-running="isRunning"
          :is-complete="isComplete"
          :is-auto-running="isAutoRunning"
          :error="error"
          @add-robot="addRobot"
          @remove-robot="removeRobot"
          @rename-robot="({ index, name }: { index: number; name: string }) => renameRobot(index, name)"
          @start="start"
          @reset="reset"
          @step="step"
          @run="runAll"
        />
        <StatsPanel :snapshot="snapshot" @scrub="jumpTo" />
      </div>
      <GridView class="col-right" :snapshot="snapshot" />
    </section>

    <footer class="foot">
      <span>robbie &amp; pals · v0.1.0</span>
      <span>MIT</span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(0.75rem, 2vw, 1.25rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* topbar */
.topbar {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--accent);
  transform: rotate(45deg);
}
.brand-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.brand-sep {
  color: var(--muted-low);
}
.brand-sub {
  font-size: 12px;
  color: var(--muted);
}
.nav-meta {
  display: flex;
  align-items: center;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px 2px 8px;
  border: 1px solid var(--border-bright);
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-dim);
  background: var(--surface);
}
.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}
.pill.state-running {
  color: var(--green);
}
.pill.state-running .pill-dot {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 22%, transparent);
}
.pill.state-complete {
  color: var(--blue);
}
.pill.state-idle {
  color: var(--muted);
}

/* header */
.page-head {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding: 16px 0 14px;
}
.head-text {
  flex: 1 1 auto;
  min-width: 0;
}
.head-text h1 {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
  max-width: 62ch;
}
.metrics {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(78px, auto));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  flex: 0 0 auto;
}
.metric {
  background: var(--surface);
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.metric dt {
  font-size: 10px;
  color: var(--muted);
  text-transform: lowercase;
}
.metric dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1.1;
}

/* workspace */
.workspace {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 12px;
  min-height: 0;
  padding-bottom: 12px;
}
.col-left {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
  min-height: 0;
}

/* footer */
.foot {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--muted);
}

/* narrow — reluctantly allow scrolling on small screens */
@media (max-width: 820px) {
  .app {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }
  .page-head {
    flex-direction: column;
    align-items: stretch;
  }
  .metrics {
    grid-template-columns: repeat(4, 1fr);
  }
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>

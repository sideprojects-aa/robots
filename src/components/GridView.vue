<script setup lang="ts">
import { computed } from 'vue'
import { robotColor } from '../utils/palette'
import type { Position } from '../simulation/Simulation'

type HouseCell = { x: number; y: number; count: number }
type Snapshot = {
  positions: Position[]
  totalPresents: number
  houses: HouseCell[]
  currentTurn: number
  totalTurns: number
  nextRobot: number | null
}

const props = defineProps<{ snapshot: Snapshot | null }>()

type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

const CELL = 24

const bounds = computed<Bounds>(() => {
  const b: Bounds = { minX: -2, maxX: 2, minY: -2, maxY: 2 }
  if (!props.snapshot) return b
  for (const h of props.snapshot.houses) {
    if (h.x < b.minX) b.minX = h.x
    if (h.x > b.maxX) b.maxX = h.x
    if (h.y < b.minY) b.minY = h.y
    if (h.y > b.maxY) b.maxY = h.y
  }
  for (const r of props.snapshot.positions) {
    if (r.x < b.minX) b.minX = r.x
    if (r.x > b.maxX) b.maxX = r.x
    if (r.y < b.minY) b.minY = r.y
    if (r.y > b.maxY) b.maxY = r.y
  }
  b.minX -= 1
  b.maxX += 1
  b.minY -= 1
  b.maxY += 1
  return b
})

const cellX = (x: number) => x * CELL
const cellY = (y: number) => -y * CELL

const viewport = computed(() => {
  const b = bounds.value
  const w = (b.maxX - b.minX + 1) * CELL
  const h = (b.maxY - b.minY + 1) * CELL
  return {
    width: w,
    height: h,
    viewBox: `${(b.minX - 0.5) * CELL} ${-(b.maxY + 0.5) * CELL} ${w} ${h}`,
  }
})

const houses = computed<HouseCell[]>(() => props.snapshot?.houses ?? [])

const maxCount = computed(() => {
  let m = 1
  for (const h of houses.value) if (h.count > m) m = h.count
  return m
})

function heatAlpha(count: number): number {
  const t = Math.min(1, count / maxCount.value)
  return 0.22 + t * 0.55
}

const robots = computed(() => props.snapshot?.positions ?? [])

function robotOffset(index: number, positions: Position[]): { dx: number; dy: number } {
  const me = positions[index]
  const peers = positions
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.x === me.x && p.y === me.y)
  if (peers.length === 1) return { dx: 0, dy: 0 }
  const order = peers.findIndex(({ i }) => i === index)
  const r = 6
  const angle = (2 * Math.PI * order) / peers.length - Math.PI / 2
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
}

const vLines = computed(() => {
  const b = bounds.value
  const out: { x: number; axis: boolean }[] = []
  for (let x = b.minX; x <= b.maxX + 1; x += 1) {
    out.push({ x: cellX(x) - CELL / 2, axis: x === 0 })
  }
  return out
})

const hLines = computed(() => {
  const b = bounds.value
  const out: { y: number; axis: boolean }[] = []
  for (let y = b.minY; y <= b.maxY + 1; y += 1) {
    out.push({ y: cellY(y) - CELL / 2, axis: y === 0 })
  }
  return out
})
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>Grid</h2>
      <span v-if="snapshot" class="extent">
        x [{{ bounds.minX + 1 }}, {{ bounds.maxX - 1 }}] · y [{{ bounds.minY + 1 }}, {{ bounds.maxY - 1 }}]
      </span>
    </header>

    <div v-if="!snapshot" class="empty">No simulation running.</div>

    <div v-else class="chart">
      <svg
        :viewBox="viewport.viewBox"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grid visualization of delivered houses and robot positions"
      >
        <g class="grid-v">
          <line
            v-for="(l, i) in vLines"
            :key="`v${i}`"
            :class="{ axis: l.axis }"
            :x1="l.x"
            :x2="l.x"
            :y1="-(bounds.maxY + 0.5) * CELL"
            :y2="-(bounds.minY - 0.5) * CELL"
          />
        </g>
        <g class="grid-h">
          <line
            v-for="(l, i) in hLines"
            :key="`h${i}`"
            :class="{ axis: l.axis }"
            :y1="l.y"
            :y2="l.y"
            :x1="(bounds.minX - 0.5) * CELL"
            :x2="(bounds.maxX + 0.5) * CELL"
          />
        </g>

        <g class="houses">
          <g
            v-for="(h, i) in houses"
            :key="i"
            :transform="`translate(${cellX(h.x)}, ${cellY(h.y)})`"
            class="house"
          >
            <rect
              :x="-CELL / 2 + 2"
              :y="-CELL / 2 + 2"
              :width="CELL - 4"
              :height="CELL - 4"
              :fill-opacity="heatAlpha(h.count)"
              rx="2"
            />
            <text class="count">{{ h.count }}</text>
          </g>
        </g>

        <g class="robots">
          <template v-for="(r, i) in robots" :key="i">
            <g
              :transform="`translate(${cellX(r.x) + robotOffset(i, robots).dx}, ${
                cellY(r.y) + robotOffset(i, robots).dy
              })`"
              class="robot"
            >
              <circle r="7.5" :fill="robotColor(i)" />
              <text class="robot-id">{{ i + 1 }}</text>
            </g>
          </template>
        </g>
      </svg>
    </div>

    <footer v-if="snapshot && robots.length" class="legend">
      <div v-for="(_, i) in robots" :key="i" class="legend-item">
        <span class="sw" :style="{ background: robotColor(i) }" />
        robot {{ i + 1 }}
      </div>
      <div class="legend-item subtle">
        <span class="sw-heat" />
        present cell
      </div>
    </footer>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  min-height: 0;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.extent {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  color: var(--muted);
  font-size: 12px;
  padding: 8px 0;
}

.chart {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.grid-v line,
.grid-h line {
  stroke: var(--border);
  stroke-width: 1;
}
.grid-v line.axis,
.grid-h line.axis {
  stroke: var(--border-bright);
}

.house rect {
  fill: var(--amber);
  transition: fill-opacity 0.3s ease;
}
.house text.count {
  fill: #1a1305;
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}

.robot {
  transition: transform 0.3s cubic-bezier(0.2, 0.6, 0.2, 1);
}
.robot circle {
  stroke: var(--bg);
  stroke-width: 1.25;
}
.robot-id {
  fill: #0a0a0a;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding-top: 2px;
  font-size: 11px;
  color: var(--text-dim);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend-item.subtle {
  color: var(--muted);
}
.sw {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.sw-heat {
  width: 10px;
  height: 8px;
  background: var(--amber);
  border-radius: 2px;
  opacity: 0.7;
}
</style>

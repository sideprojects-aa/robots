<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

const CELL = 18 // pixels per world unit at zoom = 1
const DEFAULT_ZOOM = 1.8
const MIN_ZOOM = 0.25
const MAX_ZOOM = 12

const chartEl = ref<HTMLElement | null>(null)
const size = ref({ w: 480, h: 400 })

const zoom = ref(DEFAULT_ZOOM)
const pan = ref({ x: 0, y: 0 }) // world coords at the viewport center

let resizeObs: ResizeObserver | null = null

function measure() {
  const el = chartEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width && r.height) size.value = { w: r.width, h: r.height }
}

onMounted(() => {
  if (!chartEl.value) return
  measure()
  // A second measurement after the first paint catches cases where the
  // initial layout hadn't settled — a stale size makes pan feel amplified
  // because viewBox-to-screen scale drifts away from 1:1.
  requestAnimationFrame(measure)
  resizeObs = new ResizeObserver(measure)
  resizeObs.observe(chartEl.value)
})

onBeforeUnmount(() => {
  resizeObs?.disconnect()
  window.removeEventListener('mousemove', onGlobalMove)
  window.removeEventListener('mouseup', onGlobalUp)
})

const viewBox = computed(() => {
  const { w, h } = size.value
  const vbW = w / zoom.value
  const vbH = h / zoom.value
  const vbX = pan.value.x * CELL - vbW / 2
  const vbY = -pan.value.y * CELL - vbH / 2 // y inverted (screen y grows downward)
  return { x: vbX, y: vbY, w: vbW, h: vbH, str: `${vbX} ${vbY} ${vbW} ${vbH}` }
})

// Which integer cells are (partially) visible right now
const visibleRange = computed(() => {
  const { x, y, w, h } = viewBox.value
  return {
    minX: Math.floor(x / CELL) - 1,
    maxX: Math.ceil((x + w) / CELL) + 1,
    // viewBox y is inverted from world y
    minY: Math.floor(-(y + h) / CELL) - 1,
    maxY: Math.ceil(-y / CELL) + 1,
  }
})

const cellX = (x: number) => x * CELL
const cellY = (y: number) => -y * CELL

const vLines = computed(() => {
  const out: number[] = []
  const { minX, maxX } = visibleRange.value
  for (let x = minX; x <= maxX + 1; x += 1) out.push(cellX(x) - CELL / 2)
  return out
})
const hLines = computed(() => {
  const out: number[] = []
  const { minY, maxY } = visibleRange.value
  for (let y = minY; y <= maxY + 1; y += 1) out.push(cellY(y) - CELL / 2)
  return out
})
const vLineExtent = computed(() => {
  const { minY, maxY } = visibleRange.value
  return { y1: -(maxY + 1) * CELL, y2: -(minY - 1) * CELL }
})
const hLineExtent = computed(() => {
  const { minX, maxX } = visibleRange.value
  return { x1: (minX - 1) * CELL, x2: (maxX + 1) * CELL }
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

const robots = computed<Position[]>(() => props.snapshot?.positions ?? [])

function robotOffset(index: number, positions: Position[]) {
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

/* ─── pan (mouse drag) ─────────────────────────────── */
type Drag = { mx: number; my: number; px: number; py: number }
let drag: Drag | null = null
const isDragging = ref(false)

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  // Re-measure at drag start so the pan math always matches the current
  // rendered size (the viewBox is derived from `size`, so if `size` drifts
  // from the element's real rect the drag feels amplified or compressed).
  measure()
  drag = { mx: e.clientX, my: e.clientY, px: pan.value.x, py: pan.value.y }
  isDragging.value = true
  window.addEventListener('mousemove', onGlobalMove)
  window.addEventListener('mouseup', onGlobalUp)
}
function onGlobalMove(e: MouseEvent) {
  if (!drag || !chartEl.value) return
  // Screen→world using the element's live rect width vs. the rendered viewBox width.
  // viewBox width = size.w / zoom, so scale = rect.w / (size.w / zoom) = rect.w * zoom / size.w
  // 1 screen px → 1/scale world_px = size.w / (rect.w * zoom * CELL) world units.
  const rect = chartEl.value.getBoundingClientRect()
  const scaleX = (rect.width * zoom.value) / size.value.w
  const scaleY = (rect.height * zoom.value) / size.value.h
  const dx = (e.clientX - drag.mx) / (CELL * scaleX)
  const dy = (e.clientY - drag.my) / (CELL * scaleY)
  pan.value = { x: drag.px - dx, y: drag.py + dy }
}
function onGlobalUp() {
  drag = null
  isDragging.value = false
  window.removeEventListener('mousemove', onGlobalMove)
  window.removeEventListener('mouseup', onGlobalUp)
}

/* ─── zoom (mouse wheel) ───────────────────────────── */
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const el = chartEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  // world point under cursor BEFORE zoom
  const { x: vbx, y: vby, w: vbw, h: vbh } = viewBox.value
  const worldX = (vbx + (mx / rect.width) * vbw) / CELL
  const worldY = -(vby + (my / rect.height) * vbh) / CELL

  // Exponential continuous zoom — responds proportionally to deltaY magnitude,
  // so trackpad scrolling feels smooth and mouse-wheel notches still produce
  // a noticeable step.
  const factor = Math.exp(-e.deltaY * 0.0022)
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * factor))
  if (newZoom === zoom.value) return
  zoom.value = newZoom

  // Adjust pan so (worldX, worldY) stays under the cursor after zoom
  const newVbW = rect.width / newZoom
  const newVbH = rect.height / newZoom
  pan.value = {
    x: worldX - (mx / rect.width - 0.5) * (newVbW / CELL),
    y: worldY + (my / rect.height - 0.5) * (newVbH / CELL),
  }
}

function recenter() {
  pan.value = { x: 0, y: 0 }
  zoom.value = DEFAULT_ZOOM
}

const zoomLabel = computed(() => `${zoom.value.toFixed(1)}×`)
const panLabel = computed(() => `${pan.value.x.toFixed(1)}, ${pan.value.y.toFixed(1)}`)
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>Grid</h2>
      <div class="head-actions">
        <span class="hud">zoom {{ zoomLabel }} · center ({{ panLabel }})</span>
        <button class="btn-icon" :disabled="!snapshot" @click="recenter" title="Recenter on origin">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <circle cx="6" cy="6" r="2" fill="currentColor" />
            <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1" />
            <line x1="6" y1="0" x2="6" y2="2" stroke="currentColor" stroke-width="1" />
            <line x1="6" y1="10" x2="6" y2="12" stroke="currentColor" stroke-width="1" />
            <line x1="0" y1="6" x2="2" y2="6" stroke="currentColor" stroke-width="1" />
            <line x1="10" y1="6" x2="12" y2="6" stroke="currentColor" stroke-width="1" />
          </svg>
          Recenter
        </button>
      </div>
    </header>

    <div v-if="!snapshot" class="empty">No simulation running.</div>

    <div
      v-else
      ref="chartEl"
      class="chart"
      :class="{ dragging: isDragging }"
      @mousedown="onMouseDown"
      @wheel="onWheel"
    >
      <svg
        :viewBox="viewBox.str"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        role="img"
        aria-label="Grid visualization of delivered houses and robot positions. Drag to pan, scroll to zoom."
      >
        <!-- shade the row at y=0 and the column at x=0 -->
        <g class="axis-bands">
          <rect
            :x="hLineExtent.x1"
            :y="cellY(0) - CELL / 2"
            :width="hLineExtent.x2 - hLineExtent.x1"
            :height="CELL"
          />
          <rect
            :x="cellX(0) - CELL / 2"
            :y="vLineExtent.y1"
            :width="CELL"
            :height="vLineExtent.y2 - vLineExtent.y1"
          />
        </g>

        <g class="grid-v">
          <line
            v-for="(x, i) in vLines"
            :key="`v${i}`"
            :x1="x"
            :x2="x"
            :y1="vLineExtent.y1"
            :y2="vLineExtent.y2"
          />
        </g>
        <g class="grid-h">
          <line
            v-for="(y, i) in hLines"
            :key="`h${i}`"
            :y1="y"
            :y2="y"
            :x1="hLineExtent.x1"
            :x2="hLineExtent.x2"
          />
        </g>

        <!-- origin marker -->
        <g class="origin">
          <circle :cx="cellX(0)" :cy="cellY(0)" r="1.5" />
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
      <div class="legend-item subtle help">drag to pan · scroll to zoom</div>
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
  gap: 10px;
}
h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hud {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.btn-icon {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: var(--surface);
  border: 1px solid var(--border-bright);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-dim);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.btn-icon:hover:not(:disabled) {
  border-color: #3a3a3a;
  color: var(--text);
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.chart.dragging {
  cursor: grabbing;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.grid-v line,
.grid-h line {
  stroke: var(--border);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.axis-bands rect {
  fill: rgba(237, 237, 237, 0.03);
}

.origin circle {
  fill: var(--muted);
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
  align-items: center;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend-item.subtle {
  color: var(--muted);
}
.legend-item.help {
  margin-left: auto;
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

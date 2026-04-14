<script setup lang="ts">
import { computed, ref } from 'vue'
import { robotColor } from '../utils/palette'
import type { Position, SimulationSnapshot } from '../simulation/types'

const props = defineProps<{ snapshot: SimulationSnapshot | null }>()

const emit = defineEmits<{ (e: 'scrub', turn: number): void }>()

const n = ref(1)

const housesAtLeastN = computed(() => {
  if (!props.snapshot) return 0
  const target = n.value
  if (!Number.isInteger(target) || target < 1) return 0
  let c = 0
  for (const h of props.snapshot.houses) if (h.count >= target) c += 1
  return c
})

function coord(p: Position): string {
  return `${p.x}, ${p.y}`
}

const scrubFill = computed(() => {
  const s = props.snapshot
  if (!s || s.totalTurns === 0) return 0
  return Math.round((s.currentTurn / s.totalTurns) * 100)
})

function onScrub(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) emit('scrub', v)
}

const nameOf = (i: number) => props.snapshot?.names[i] ?? `robot ${i + 1}`
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>State</h2>
      <span v-if="snapshot" class="turn">
        turn <strong>{{ snapshot.currentTurn }}</strong> / {{ snapshot.totalTurns }}
      </span>
    </header>

    <div v-if="!snapshot" class="empty">Start a simulation to see state.</div>

    <template v-else>
      <div class="scrub">
        <input
          type="range"
          min="0"
          :max="snapshot.totalTurns"
          :value="snapshot.currentTurn"
          :disabled="snapshot.totalTurns === 0"
          :style="{ '--fill': scrubFill }"
          aria-label="Scrub through simulation turns"
          @input="onScrub"
        />
      </div>

      <div class="query">
        <label for="houses-at-least" class="query-label">
          Houses with ≥
          <input
            id="houses-at-least"
            aria-label="Minimum presents per house"
            type="number"
            min="1"
            step="1"
            v-model.number="n"
          />
          presents
        </label>
        <span class="query-out">{{ housesAtLeastN }}</span>
      </div>

      <div class="robots">
        <ol>
          <li
            v-for="(p, i) in snapshot.positions"
            :key="i"
            :class="{ 'is-next': snapshot.nextRobot === i }"
          >
            <span class="dot" :style="{ background: robotColor(i) }" />
            <span class="robot-name">{{ nameOf(i) }}</span>
            <span class="robot-coord">({{ coord(p) }})</span>
            <span v-if="snapshot.nextRobot === i" class="next">next</span>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
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
.turn {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.turn strong {
  color: var(--text);
  font-weight: 600;
}

.empty {
  color: var(--muted);
  font-size: 12px;
  padding: 8px 0;
}

/* scrubber — styled range input */
.scrub {
  padding: 6px 0 2px;
}
.scrub input[type='range'] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 18px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
.scrub input[type='range']:focus {
  outline: none;
}
.scrub input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  background: linear-gradient(
    to right,
    var(--accent) 0 calc(var(--fill, 0) * 1%),
    var(--border) calc(var(--fill, 0) * 1%) 100%
  );
  border-radius: 999px;
}
.scrub input[type='range']::-moz-range-track {
  height: 3px;
  background: var(--border);
  border-radius: 999px;
}
.scrub input[type='range']::-moz-range-progress {
  height: 3px;
  background: var(--accent);
  border-radius: 999px;
}
.scrub input[type='range']::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--accent);
  border: 2px solid #000;
  margin-top: -5.5px;
  box-shadow: 0 0 0 1px var(--accent);
  transition: transform 0.12s ease;
}
.scrub input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
.scrub input[type='range']::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--accent);
  border: 2px solid #000;
  box-shadow: 0 0 0 1px var(--accent);
}
.scrub input[type='range']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* query */
.query {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.query-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim);
  flex-wrap: wrap;
}
.query-label input {
  width: 52px;
  background: var(--bg);
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  text-align: center;
  outline: none;
}
.query-label input:focus {
  border-color: #3a3a3a;
}
.query-out {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

/* robots */
.robots {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.robots ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: auto;
  min-height: 0;
}
.robots li {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--surface);
  font-size: 12px;
}
.robots li.is-next {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.robot-name {
  color: var(--text);
  font-weight: 500;
}
.robot-coord {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}
.next {
  font-size: 10px;
  padding: 1px 6px;
  border: 1px solid var(--border-bright);
  border-radius: 999px;
  color: var(--text-dim);
}
.is-next .next {
  color: var(--text);
  border-color: var(--text-dim);
}
</style>

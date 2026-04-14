<script setup lang="ts">
import { computed, ref } from 'vue'
import { robotColor } from '../utils/palette'
import type { Position, SimulationSnapshot } from '../simulation/types'

const props = defineProps<{ snapshot: SimulationSnapshot | null }>()

const n = ref(1)

const housesAtLeastN = computed(() => {
  if (!props.snapshot) return 0
  const target = n.value
  if (!Number.isInteger(target) || target < 1) return 0
  let c = 0
  for (const h of props.snapshot.houses) if (h.count >= target) c += 1
  return c
})

const percent = computed(() => {
  if (!props.snapshot || props.snapshot.totalTurns === 0) return 0
  return Math.round((props.snapshot.currentTurn / props.snapshot.totalTurns) * 100)
})

function coord(p: Position): string {
  return `${p.x}, ${p.y}`
}
</script>

<template>
  <section class="panel">
    <header class="panel-head">
      <h2>State</h2>
      <span v-if="snapshot" class="pct">{{ percent }}%</span>
    </header>

    <div v-if="!snapshot" class="empty">Start a simulation to see state.</div>

    <template v-else>
      <div class="rail">
        <div class="rail-fill" :style="{ width: percent + '%' }" />
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
            <span class="robot-name">robot {{ i + 1 }}</span>
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
.pct {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

.empty {
  color: var(--muted);
  font-size: 12px;
  padding: 8px 0;
}

.rail {
  height: 3px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.rail-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.35s cubic-bezier(0.2, 0.6, 0.2, 1);
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

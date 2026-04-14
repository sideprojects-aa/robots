<script setup lang="ts">
const props = defineProps<{
  numRobots: number
  moves: string
  isRunning: boolean
  isComplete: boolean
  isAutoRunning: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'update:numRobots', v: number): void
  (e: 'update:moves', v: string): void
  (e: 'start'): void
  (e: 'reset'): void
  (e: 'step'): void
  (e: 'run'): void
}>()

function onNum(v: string) {
  const n = Number.parseInt(v, 10)
  if (Number.isFinite(n)) emit('update:numRobots', n)
}

function append(ch: string) {
  if (props.isRunning) return
  emit('update:moves', props.moves + ch)
}
</script>

<template>
  <aside class="panel">
    <header class="panel-head">
      <h2>Configure</h2>
    </header>

    <div class="field">
      <label for="num-robots">Robots</label>
      <input
        id="num-robots"
        type="number"
        min="1"
        step="1"
        :value="numRobots"
        :disabled="isRunning"
        @input="onNum(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="field">
      <label for="moves">Move sequence</label>
      <textarea
        id="moves"
        rows="2"
        spellcheck="false"
        :value="moves"
        :disabled="isRunning"
        placeholder="^^VV<>"
        @input="emit('update:moves', ($event.target as HTMLTextAreaElement).value)"
      />
      <div class="hint">
        <button
          v-for="c in ['^', 'V', '<', '>']"
          :key="c"
          type="button"
          class="key"
          :disabled="isRunning"
          :aria-label="`Append ${c}`"
          @click="append(c)"
        >{{ c }}</button>
      </div>
    </div>

    <div v-if="error" class="error" role="alert">
      {{ error }}
    </div>

    <div class="actions">
      <button v-if="!isRunning" class="btn primary" @click="emit('start')">
        Start
      </button>
      <template v-else>
        <button class="btn" :disabled="isComplete || isAutoRunning" @click="emit('step')">Step</button>
        <button class="btn primary" :disabled="isComplete || isAutoRunning" @click="emit('run')">
          <span v-if="isAutoRunning" class="run-dot" aria-hidden></span>
          {{ isAutoRunning ? 'Running' : 'Run' }}
        </button>
        <button class="btn ghost" @click="emit('reset')">Reset</button>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
  align-content: start;
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
  letter-spacing: -0.005em;
}

.field {
  display: grid;
  gap: 6px;
}
.field label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-bright);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  resize: vertical;
}
input:focus,
textarea:focus {
  border-color: #3a3a3a;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
}
input:disabled,
textarea:disabled {
  color: var(--muted);
  cursor: not-allowed;
  background: var(--surface-2);
}

.hint {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}
.key {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  background: var(--surface-2);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}
.key:hover:not(:disabled) {
  color: var(--text);
  border-color: #3a3a3a;
  background: #1a1a1a;
}
.key:active:not(:disabled) {
  background: #222;
}
.key:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.error {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--red) 40%, var(--border));
  background: color-mix(in srgb, var(--red) 8%, transparent);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--red);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}
.btn {
  appearance: none;
  border: 1px solid var(--border-bright);
  background: var(--surface);
  color: var(--text-dim);
  padding: 6px 12px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}
.btn:hover:not(:disabled) {
  border-color: #3a3a3a;
  color: var(--text);
}
.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}
.btn.primary:hover:not(:disabled) {
  background: #fff;
  border-color: #fff;
  color: #000;
}
.btn.ghost {
  margin-left: auto;
  border-color: #ededed;
  color: #ededed;
}
.btn.ghost:hover:not(:disabled) {
  border-color: #ededed;
  color: #ededed;
  background: rgba(237, 237, 237, 0.08);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.run-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  margin-right: 6px;
  animation: run-pulse 0.8s ease-in-out infinite;
  vertical-align: middle;
}
@keyframes run-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>

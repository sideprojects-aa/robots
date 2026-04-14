export type Position = { readonly x: number; readonly y: number }

export type House = {
  readonly x: number
  readonly y: number
  readonly count: number
}

/**
 * Plain, serialisable view of the simulation at one instant in time.
 * Shared between App.vue, StatsPanel, and GridView so they all agree on shape.
 */
export type SimulationSnapshot = {
  positions: Position[]
  totalPresents: number
  houses: House[]
  currentTurn: number
  totalTurns: number
  nextRobot: number | null
}

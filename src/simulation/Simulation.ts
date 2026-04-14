import type { House, Position } from './types'

export type { House, Position, SimulationSnapshot } from './types'

export type Move = '^' | 'V' | '<' | '>'

const MOVE_DELTAS: Record<Move, Position> = {
  '^': { x: 0, y: 1 },
  V: { x: 0, y: -1 },
  '<': { x: -1, y: 0 },
  '>': { x: 1, y: 0 },
}

const toKey = (p: Position): string => `${p.x},${p.y}`

export class Simulation {
  readonly numRobots: number
  readonly moves: string

  private readonly robots: { x: number; y: number }[]
  private readonly houses = new Map<string, number>()
  private turn = 0
  private delivered = 0

  constructor(numRobots: number = 1, moves: string = '') {
    if (!Number.isInteger(numRobots) || numRobots < 1) {
      throw new RangeError('numRobots must be an integer >= 1')
    }
    for (const ch of moves) {
      if (!(ch in MOVE_DELTAS)) {
        throw new Error(`Invalid move character '${ch}' — allowed: ^ V < >`)
      }
    }
    this.numRobots = numRobots
    this.moves = moves
    this.robots = Array.from({ length: numRobots }, () => ({ x: 0, y: 0 }))
  }

  get currentTurn(): number {
    return this.turn
  }

  get isComplete(): boolean {
    return this.turn >= this.moves.length
  }

  get totalPresentsDelivered(): number {
    return this.delivered
  }

  /** Robot whose turn comes next (0-indexed), or null if simulation is complete. */
  get nextRobotIndex(): number | null {
    return this.isComplete ? null : this.turn % this.numRobots
  }

  getPositions(): Position[] {
    return this.robots.map((r) => ({ x: r.x, y: r.y }))
  }

  /**
   * Snapshot of every house that has received at least one present,
   * with its integer coordinates and delivery count.
   */
  getHouses(): House[] {
    const out: House[] = []
    for (const [key, count] of this.houses) {
      const comma = key.indexOf(',')
      out.push({
        x: Number(key.slice(0, comma)),
        y: Number(key.slice(comma + 1)),
        count,
      })
    }
    return out
  }

  /** Advance one instruction. Returns false if the simulation is already complete. */
  step(): boolean {
    if (this.isComplete) return false

    const move = this.moves[this.turn] as Move
    const delta = MOVE_DELTAS[move]
    const robotIdx = this.turn % this.numRobots
    const robot = this.robots[robotIdx]

    robot.x += delta.x
    robot.y += delta.y
    this.turn += 1

    if (this.isAloneAt(robotIdx, robot)) {
      const key = toKey(robot)
      this.houses.set(key, (this.houses.get(key) ?? 0) + 1)
      this.delivered += 1
    }
    return true
  }

  /** Run the full remaining sequence. */
  run(): void {
    while (this.step()) {
      // intentional
    }
  }

  /**
   * Number of houses that have received at least `n` presents.
   * `n` must be a positive integer.
   */
  housesWithAtLeast(n: number): number {
    if (!Number.isInteger(n) || n < 1) {
      throw new RangeError('n must be a positive integer')
    }
    let count = 0
    for (const c of this.houses.values()) {
      if (c >= n) count += 1
    }
    return count
  }

  private isAloneAt(robotIdx: number, pos: Position): boolean {
    for (let i = 0; i < this.robots.length; i += 1) {
      if (i === robotIdx) continue
      const other = this.robots[i]
      if (other.x === pos.x && other.y === pos.y) return false
    }
    return true
  }
}

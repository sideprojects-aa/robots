import { describe, it, expect } from 'vitest'
import { Simulation } from './Simulation'

describe('Simulation', () => {
  describe('construction', () => {
    it('defaults all robots to the origin', () => {
      const sim = new Simulation(3, '')
      expect(sim.getPositions()).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ])
    })

    it('defaults to a single robot and an empty move sequence', () => {
      const sim = new Simulation()
      expect(sim.numRobots).toBe(1)
      expect(sim.moves).toBe('')
      expect(sim.getPositions()).toEqual([{ x: 0, y: 0 }])
      expect(sim.isComplete).toBe(true)
    })

    it('rejects zero or negative robot counts', () => {
      expect(() => new Simulation(0, '')).toThrow(RangeError)
      expect(() => new Simulation(-1, '')).toThrow(RangeError)
      expect(() => new Simulation(1.5, '')).toThrow(RangeError)
    })

    it('rejects invalid move characters up front', () => {
      expect(() => new Simulation(1, '^^X')).toThrow(/Invalid move/)
    })

    it('does not deliver a present at the origin before any turn', () => {
      const sim = new Simulation(1, '')
      expect(sim.totalPresentsDelivered).toBe(0)
      expect(sim.housesWithAtLeast(1)).toBe(0)
    })
  })

  describe('turn order', () => {
    it('dispatches instructions round-robin across robots', () => {
      // Example from the brief: 3 robots, moves "^^VV<>"
      // robbie:^, jane:^, bob:V, robbie:V, jane:<, bob:>
      const sim = new Simulation(3, '^^VV<>')
      sim.run()
      const [robbie, jane, bob] = sim.getPositions()
      expect(robbie).toEqual({ x: 0, y: 0 }) // ^ then V cancels
      expect(jane).toEqual({ x: -1, y: 1 }) // ^ then <
      expect(bob).toEqual({ x: 1, y: -1 }) // V then >
    })
  })

  describe('deliveries', () => {
    it('delivers one present per turn when the robot ends alone on a space', () => {
      const sim = new Simulation(1, '^>V<')
      sim.run()
      expect(sim.totalPresentsDelivered).toBe(4)
      // Single robot lands on 4 distinct houses
      expect(sim.housesWithAtLeast(1)).toBe(4)
      expect(sim.housesWithAtLeast(2)).toBe(0)
    })

    it('counts revisits as additional presents', () => {
      const sim = new Simulation(1, '^V^V')
      sim.run()
      // Visits (0,1), (0,0), (0,1), (0,0) — each delivery counts
      expect(sim.totalPresentsDelivered).toBe(4)
      expect(sim.housesWithAtLeast(1)).toBe(2)
      expect(sim.housesWithAtLeast(2)).toBe(2)
      expect(sim.housesWithAtLeast(3)).toBe(0)
    })

    it('blocks the second robot when it lands on a space already occupied', () => {
      // Turns are sequential: robot 0 reaches (0,1) alone -> delivers.
      // Robot 1 then reaches (0,1) with robot 0 still there -> does NOT deliver.
      const sim = new Simulation(2, '^^')
      sim.step()
      expect(sim.totalPresentsDelivered).toBe(1)
      sim.step()
      expect(sim.totalPresentsDelivered).toBe(1)
      expect(sim.housesWithAtLeast(1)).toBe(1)
    })

    it('blocks a delivery when a stationary robot is parked on the landing space', () => {
      // Robot 0 ends at (0,1) alone (delivery).
      // Robot 1 walks ^>V< — ends at (0,0), but robot 0 isn't there. No conflict, deliveries continue.
      // We instead force overlap: robot 0: ^, robot 1: ^, robot 0: V, robot 1: V.
      // Turns 0-1: robot 0 -> (0,1) alone -> delivers.  robot 1 -> (0,1) blocked.
      // Turns 2-3: robot 0 -> (0,0), robot 1 still at (0,1). Alone -> delivers.
      //            robot 1 -> (0,0), robot 0 there. Blocked.
      const sim = new Simulation(2, '^^VV')
      sim.run()
      expect(sim.totalPresentsDelivered).toBe(2)
      expect(sim.housesWithAtLeast(1)).toBe(2)
    })
  })

  describe('stepping', () => {
    it('step() returns false once all moves are consumed', () => {
      const sim = new Simulation(1, '^')
      expect(sim.step()).toBe(true)
      expect(sim.step()).toBe(false)
      expect(sim.isComplete).toBe(true)
    })

    it('tracks whose turn is next', () => {
      const sim = new Simulation(2, '^^^^')
      expect(sim.nextRobotIndex).toBe(0)
      sim.step()
      expect(sim.nextRobotIndex).toBe(1)
      sim.step()
      expect(sim.nextRobotIndex).toBe(0)
      sim.run()
      expect(sim.nextRobotIndex).toBeNull()
    })
  })

  describe('housesWithAtLeast', () => {
    it('rejects non-positive n', () => {
      const sim = new Simulation(1, '^')
      expect(() => sim.housesWithAtLeast(0)).toThrow(RangeError)
      expect(() => sim.housesWithAtLeast(-1)).toThrow(RangeError)
      expect(() => sim.housesWithAtLeast(1.5)).toThrow(RangeError)
    })
  })

  describe('getHouses', () => {
    it('returns structured {x, y, count} entries with numeric coordinates', () => {
      const sim = new Simulation(1, '^>V<')
      sim.run()
      const houses = sim.getHouses()
      expect(houses).toHaveLength(4)
      for (const h of houses) {
        expect(typeof h.x).toBe('number')
        expect(typeof h.y).toBe('number')
        expect(typeof h.count).toBe('number')
      }
      const coords = new Set(houses.map((h) => `${h.x},${h.y}`))
      expect(coords).toEqual(new Set(['0,1', '1,1', '1,0', '0,0']))
    })

    it('reports accumulated counts for revisited cells', () => {
      const sim = new Simulation(1, '^V^V^V')
      sim.run()
      const houses = sim.getHouses()
      const byKey = new Map(houses.map((h) => [`${h.x},${h.y}`, h.count]))
      expect(byKey.get('0,1')).toBe(3)
      expect(byKey.get('0,0')).toBe(3)
    })
  })

  describe('run vs. manual stepping', () => {
    it('run() produces the same final state as repeated step() calls', () => {
      const moves = '^^VV<><>^V<>'
      const byRun = new Simulation(3, moves)
      byRun.run()

      const byStep = new Simulation(3, moves)
      while (byStep.step()) {
        // intentional
      }

      expect(byStep.totalPresentsDelivered).toBe(byRun.totalPresentsDelivered)
      expect(byStep.getPositions()).toEqual(byRun.getPositions())
      expect(byStep.getHouses()).toEqual(byRun.getHouses())
    })
  })

  describe('mid-simulation queries', () => {
    it('returns correct state between steps without requiring completion', () => {
      const sim = new Simulation(3, '^^VV<>')

      sim.step() // robbie ^
      expect(sim.totalPresentsDelivered).toBe(1)
      expect(sim.getPositions()[0]).toEqual({ x: 0, y: 1 })
      expect(sim.currentTurn).toBe(1)
      expect(sim.nextRobotIndex).toBe(1)

      sim.step() // jane ^  (blocked by robbie at (0,1))
      expect(sim.totalPresentsDelivered).toBe(1)
      expect(sim.getPositions()[1]).toEqual({ x: 0, y: 1 })

      sim.step() // bob V
      expect(sim.totalPresentsDelivered).toBe(2)
      expect(sim.housesWithAtLeast(1)).toBe(2)
    })
  })

  describe('time-travel by re-stepping', () => {
    it('rebuilding the simulation and stepping to turn N is deterministic', () => {
      // This is what the UI's scrub slider relies on.
      const moves = '^^VV<>^V<>'
      const canonical = new Simulation(3, moves)
      for (let i = 0; i < 5; i += 1) canonical.step()

      const rebuilt = new Simulation(3, moves)
      for (let i = 0; i < 5; i += 1) rebuilt.step()

      expect(rebuilt.getPositions()).toEqual(canonical.getPositions())
      expect(rebuilt.totalPresentsDelivered).toBe(canonical.totalPresentsDelivered)
      expect(rebuilt.currentTurn).toBe(5)
    })
  })
})

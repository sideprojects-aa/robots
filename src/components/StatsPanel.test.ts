import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsPanel from './StatsPanel.vue'
import type { SimulationSnapshot } from '../simulation/types'

function snap(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    positions: [
      { x: 0, y: 0 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
    ],
    names: ['robbie', 'jane', 'bob'],
    totalPresents: 5,
    houses: [
      { x: 0, y: 1, count: 1 },
      { x: -1, y: 1, count: 1 },
      { x: 0, y: 0, count: 1 },
      { x: 0, y: -1, count: 1 },
      { x: 1, y: -1, count: 1 },
    ],
    currentTurn: 6,
    totalTurns: 6,
    nextRobot: null,
    ...overrides,
  }
}

describe('StatsPanel', () => {
  it('shows an empty placeholder when there is no simulation', () => {
    const wrapper = mount(StatsPanel, { props: { snapshot: null } })
    expect(wrapper.text()).toContain('Start a simulation')
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
  })

  it('renders robot names from the snapshot', () => {
    const wrapper = mount(StatsPanel, { props: { snapshot: snap() } })
    const text = wrapper.text()
    expect(text).toContain('robbie')
    expect(text).toContain('jane')
    expect(text).toContain('bob')
  })

  it('marks the next-to-move robot', () => {
    const wrapper = mount(StatsPanel, {
      props: { snapshot: snap({ currentTurn: 1, nextRobot: 1 }) },
    })
    const next = wrapper.find('.is-next')
    expect(next.exists()).toBe(true)
    expect(next.text()).toContain('jane')
  })

  it('emits "scrub" with the slider value when the user drags', async () => {
    const wrapper = mount(StatsPanel, { props: { snapshot: snap() } })
    const slider = wrapper.find('input[type="range"]')
    await slider.setValue(3)
    expect(wrapper.emitted('scrub')).toEqual([[3]])
  })

  it('counts houses meeting the "at least n" query', async () => {
    const wrapper = mount(StatsPanel, {
      props: {
        snapshot: snap({
          houses: [
            { x: 0, y: 0, count: 3 },
            { x: 1, y: 0, count: 2 },
            { x: 2, y: 0, count: 1 },
          ],
        }),
      },
    })
    // default n = 1 → all three houses
    expect(wrapper.find('.query-out').text()).toBe('3')
    await wrapper.find('#houses-at-least').setValue(2)
    expect(wrapper.find('.query-out').text()).toBe('2')
    await wrapper.find('#houses-at-least').setValue(3)
    expect(wrapper.find('.query-out').text()).toBe('1')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GridView from './GridView.vue'
import type { SimulationSnapshot } from '../simulation/types'

// jsdom doesn't implement ResizeObserver; stub it before mounting.
beforeEach(() => {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function snap(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    positions: [
      { x: 0, y: 0 },
      { x: -1, y: 1 },
    ],
    names: ['robbie', 'jane'],
    totalPresents: 2,
    houses: [
      { x: 0, y: 0, count: 1 },
      { x: -1, y: 1, count: 1 },
    ],
    currentTurn: 2,
    totalTurns: 2,
    nextRobot: null,
    ...overrides,
  }
}

describe('GridView', () => {
  it('shows an empty state when there is no simulation', () => {
    const wrapper = mount(GridView, { props: { snapshot: null } })
    expect(wrapper.text()).toContain('No simulation running')
    // The only SVG in the empty state is the Recenter button icon.
    expect(wrapper.find('.chart').exists()).toBe(false)
  })

  it('renders one circle per robot and one rect per house', () => {
    const wrapper = mount(GridView, { props: { snapshot: snap() } })
    const robotCircles = wrapper.findAll('.robot circle')
    const houseRects = wrapper.findAll('.house rect')
    expect(robotCircles).toHaveLength(2)
    expect(houseRects).toHaveLength(2)
  })

  it('lists robot names in the legend', () => {
    const wrapper = mount(GridView, { props: { snapshot: snap() } })
    const legend = wrapper.find('.legend').text()
    expect(legend).toContain('robbie')
    expect(legend).toContain('jane')
  })

  it('shows the current zoom and pan in the HUD', () => {
    const wrapper = mount(GridView, { props: { snapshot: snap() } })
    const hud = wrapper.find('.hud').text()
    expect(hud).toMatch(/zoom \d+\.\d×/)
    expect(hud).toMatch(/center \(0\.0, 0\.0\)/)
  })

  it('Recenter resets pan/zoom back to the defaults', async () => {
    const wrapper = mount(GridView, { props: { snapshot: snap() } })
    const chart = wrapper.find('.chart').element as HTMLElement

    // Stub the bounding rect so the wheel handler has stable numbers.
    const rect = {
      left: 0, top: 0, right: 400, bottom: 400,
      width: 400, height: 400, x: 0, y: 0,
      toJSON: () => ({}),
    }
    chart.getBoundingClientRect = vi.fn(() => rect as DOMRect)

    // Dispatch a real WheelEvent — vue-test-utils' .trigger can't set
    // clientX/clientY on the constructed event under jsdom.
    chart.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -240,
        clientX: 200,
        clientY: 200,
        bubbles: true,
        cancelable: true,
      }),
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hud').text()).not.toMatch(/zoom 2\.2×/)

    await wrapper.find('.btn-icon').trigger('click')
    const hud = wrapper.find('.hud').text()
    expect(hud).toMatch(/zoom 2\.2×/)
    expect(hud).toMatch(/center \(0\.0, 0\.0\)/)
  })
})

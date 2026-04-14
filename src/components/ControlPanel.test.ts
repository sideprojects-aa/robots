import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ControlPanel from './ControlPanel.vue'

const baseProps = {
  robotNames: ['robbie', 'jane', 'bob'],
  moves: '^^VV<>',
  isRunning: false,
  isComplete: false,
  isAutoRunning: false,
  error: null,
}

describe('ControlPanel', () => {
  it('renders one input per robot name', () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    const inputs = wrapper.findAll('.robot-list input')
    expect(inputs).toHaveLength(3)
    expect(inputs[0].element.value).toBe('robbie')
    expect(inputs[1].element.value).toBe('jane')
    expect(inputs[2].element.value).toBe('bob')
  })

  it('emits renameRobot when a name input changes', async () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    const input = wrapper.findAll('.robot-list input')[1]
    await input.setValue('janie')
    const events = wrapper.emitted('renameRobot')
    expect(events).toBeTruthy()
    expect(events![0][0]).toEqual({ index: 1, name: 'janie' })
  })

  it('emits removeRobot with the row index when × is clicked', async () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    const removes = wrapper.findAll('.robot-list .remove')
    await removes[2].trigger('click')
    expect(wrapper.emitted('removeRobot')).toEqual([[2]])
  })

  it('emits addRobot when the + Add robot button is clicked', async () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    await wrapper.find('.add').trigger('click')
    expect(wrapper.emitted('addRobot')).toHaveLength(1)
  })

  it('disables the remove button when only one robot remains', () => {
    const wrapper = mount(ControlPanel, {
      props: { ...baseProps, robotNames: ['solo'] },
    })
    const remove = wrapper.find('.robot-list .remove')
    expect((remove.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('appends the character to the move sequence when a key chip is pressed', async () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    const keys = wrapper.findAll('.key')
    await keys[0].trigger('click') // ^
    const emitted = wrapper.emitted('update:moves')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe('^^VV<>^')
  })

  it('locks name editing, add, and key chips while the simulation is running', () => {
    const wrapper = mount(ControlPanel, {
      props: { ...baseProps, isRunning: true },
    })
    for (const input of wrapper.findAll('.robot-list input')) {
      expect((input.element as HTMLInputElement).disabled).toBe(true)
    }
    expect((wrapper.find('.add').element as HTMLButtonElement).disabled).toBe(true)
    for (const key of wrapper.findAll('.key')) {
      expect((key.element as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('shows Start when idle and Step/Run/Reset once the simulation is running', async () => {
    const wrapper = mount(ControlPanel, { props: baseProps })
    expect(wrapper.text()).toContain('Start')
    expect(wrapper.text()).not.toContain('Step')

    await wrapper.setProps({ isRunning: true })
    const text = wrapper.text()
    expect(text).toContain('Step')
    expect(text).toContain('Run')
    expect(text).toContain('Reset')
  })
})

import { describe, it, expect } from 'vitest'
import {
  presentNextAction,
  presentFindingsSummary,
  presentModulesSummary,
  presentRoute,
  presentReadiness,
  presentKnowledgeCount,
  presentWorkItemsSummary,
} from '../src/lib/presentation'

describe('presentNextAction', () => {
  it('renders title independently from command', () => {
    const result = presentNextAction({
      overall: 'initialized',
      recommendedNextStep: { label: 'Define roadmap candidates', command: 'kaddo roadmap' },
    })
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Define roadmap candidates')
    expect(result!.command).toBe('kaddo roadmap')
  })

  it('extracts agent when available', () => {
    const result = presentNextAction({
      overall: 'delivery-completed',
      recommendedNextStep: { label: 'Use roadmap-agent to define roadmap candidates (kaddo roadmap).', command: 'kaddo roadmap' },
    })
    expect(result!.agent).toBe('roadmap-agent')
    expect(result!.title).not.toContain('roadmap-agent')
    expect(result!.command).toBe('kaddo roadmap')
  })

  it('works without agent', () => {
    const result = presentNextAction({
      overall: 'not-applicable',
      recommendedNextStep: { label: 'Define product capabilities', command: undefined },
    })
    expect(result!.agent).toBeUndefined()
    expect(result!.title).toBe('Define product capabilities')
    expect(result!.command).toBeUndefined()
  })

  it('works without command', () => {
    const result = presentNextAction({
      overall: 'initialized',
      recommendedNextStep: { label: 'Configure knowledge layers' },
    })
    expect(result!.command).toBeUndefined()
    expect(result!.title).toBeTruthy()
  })

  it('returns null when no recommendation', () => {
    const result = presentNextAction({
      overall: 'ready',
      recommendedNextStep: { label: '' },
    })
    expect(result).toBeNull()
  })
})

describe('presentFindingsSummary', () => {
  it('shows "No findings" when all zero', () => {
    const result = presentFindingsSummary(0, 0, 0)
    expect(result.total).toBe(0)
    expect(result.label).toBe('No findings')
    expect(result.tone).toBe('success')
  })

  it('does not use "No blockers" as label', () => {
    const result = presentFindingsSummary(0, 0, 0)
    expect(result.label).not.toContain('blocker')
  })

  it('summarizes by severity with warnings and FYI', () => {
    const result = presentFindingsSummary(0, 2, 1)
    expect(result.total).toBe(3)
    expect(result.label).toBe('2 warnings · 1 FYI')
    expect(result.tone).toBe('warning')
  })

  it('blocking has highest priority', () => {
    const result = presentFindingsSummary(1, 2, 0)
    expect(result.total).toBe(3)
    expect(result.label).toBe('1 blocking · 2 warnings')
    expect(result.tone).toBe('danger')
  })

  it('single warning uses singular', () => {
    const result = presentFindingsSummary(0, 1, 0)
    expect(result.label).toBe('1 warning')
  })
})

describe('presentModulesSummary', () => {
  it('shows "No modules registered" for zero', () => {
    expect(presentModulesSummary(0)).toBe('No modules registered')
  })

  it('shows "Registered" for one or more', () => {
    expect(presentModulesSummary(1)).toBe('Registered')
    expect(presentModulesSummary(3)).toBe('Registered')
  })
})

describe('presentRoute', () => {
  it('provides workflow coverage label', () => {
    const result = presentRoute(12, 16)
    expect(result.completed).toBe(12)
    expect(result.total).toBe(16)
    expect(result.label).toBe('Overall Kaddo workflow coverage')
  })
})

describe('presentReadiness', () => {
  it('delivery-completed shows success', () => {
    const result = presentReadiness('delivery-completed')
    expect(result.label).toBe('Delivery completed')
    expect(result.tone).toBe('success')
  })

  it('not-applicable shows "Needs attention"', () => {
    const result = presentReadiness('not-applicable')
    expect(result.label).toBe('Needs attention')
    expect(result.tone).toBe('warning')
  })

  it('canonical values are never exposed as-is for not-applicable', () => {
    const result = presentReadiness('not-applicable')
    expect(result.label).not.toBe('not-applicable')
    expect(result.label).not.toBe('Not Applicable')
  })
})

describe('presentKnowledgeCount', () => {
  it('counts non-missing layers', () => {
    const layers = [
      { status: 'Consolidated' },
      { status: 'Structured' },
      { status: 'Missing' },
      { status: 'Traceable' },
    ]
    const result = presentKnowledgeCount(layers)
    expect(result.ready).toBe(3)
    expect(result.total).toBe(4)
  })
})

describe('presentWorkItemsSummary', () => {
  it('shows completed count', () => {
    expect(presentWorkItemsSummary({ completed: 1 }, 1)).toBe('1 completed')
  })

  it('shows active and completed', () => {
    expect(presentWorkItemsSummary({ completed: 1 }, 3)).toBe('1 completed · 2 active')
  })

  it('shows "No work items" for zero', () => {
    expect(presentWorkItemsSummary({}, 0)).toBe('No work items')
  })
})

describe('delivery vs route independence', () => {
  it('delivery-completed is valid with incomplete route', () => {
    const readiness = presentReadiness('delivery-completed')
    const route = presentRoute(12, 16)
    expect(readiness.label).toBe('Delivery completed')
    expect(readiness.tone).toBe('success')
    expect(route.completed).toBe(12)
    expect(route.total).toBe(16)
    expect(route.label).toContain('workflow')
  })
})

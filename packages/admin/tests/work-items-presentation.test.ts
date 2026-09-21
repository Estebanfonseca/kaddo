import { describe, it, expect } from 'vitest'
import {
  presentDeliveryStatus,
  presentCoverageStatus,
  presentGateStatus,
  presentScopeConfidence,
  isPrimaryCoverage,
  toneToVariant,
} from '../src/lib/presentation'

describe('presentDeliveryStatus', () => {
  it('humanizes canonical delivery values', () => {
    expect(presentDeliveryStatus('accepted-with-exceptions')).toEqual({ label: 'Accepted With Exceptions', tone: 'warning' })
    expect(presentDeliveryStatus('blocked')).toEqual({ label: 'Blocked', tone: 'danger' })
    expect(presentDeliveryStatus('completed')).toEqual({ label: 'Completed', tone: 'success' })
  })

  it('returns null for absent status (never invents one)', () => {
    expect(presentDeliveryStatus(null)).toBeNull()
    expect(presentDeliveryStatus(undefined)).toBeNull()
  })

  it('does not turn not-assessed into a failure', () => {
    expect(presentDeliveryStatus('not-assessed')).toEqual({ label: 'Not Assessed', tone: 'neutral' })
  })
})

describe('presentCoverageStatus', () => {
  it('maps canonical coverage to human-readable labels', () => {
    expect(presentCoverageStatus('reviewed-not-affected').label).toBe('Reviewed — not affected')
    expect(presentCoverageStatus('affected').label).toBe('Affected')
    expect(presentCoverageStatus('not-applicable').label).toBe('Not applicable')
  })
})

describe('presentScopeConfidence', () => {
  it('shows Not assessed when level is absent', () => {
    expect(presentScopeConfidence(null)).toEqual({ label: 'Not assessed', tone: 'neutral' })
  })
  it('maps levels to tones', () => {
    expect(presentScopeConfidence('high').tone).toBe('success')
    expect(presentScopeConfidence('low').tone).toBe('danger')
  })
})

describe('presentGateStatus', () => {
  it('keeps pending as pending, not failed', () => {
    expect(presentGateStatus('pending')).toEqual({ label: 'Pending', tone: 'warning' })
    expect(presentGateStatus('blocked').tone).toBe('danger')
  })
})

describe('progressive disclosure', () => {
  it('affected and unknown are primary; reviewed/not-applicable are secondary', () => {
    expect(isPrimaryCoverage('affected')).toBe(true)
    expect(isPrimaryCoverage('unknown')).toBe(true)
    expect(isPrimaryCoverage('reviewed-not-affected')).toBe(false)
    expect(isPrimaryCoverage('not-applicable')).toBe(false)
  })
})

describe('toneToVariant', () => {
  it('maps neutral to muted, passes others through', () => {
    expect(toneToVariant('neutral')).toBe('muted')
    expect(toneToVariant('success')).toBe('success')
  })
})

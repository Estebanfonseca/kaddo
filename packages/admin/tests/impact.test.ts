import { describe, it, expect } from 'vitest'
import { buildImpactRows, impactCounts, coverageNotice } from '../src/lib/impact'
import type { SystemImpactEntity, ReviewedSystemEntity } from '../src/lib/api'

// VS-101.1 — the impact-view logic the SYSTEM IMPACT section and the System Explorer overlay share.
// Guarantees summary/entity consistency and the coverage-warning contract without a DOM.

function entity(id: string, extra: Partial<SystemImpactEntity> = {}): SystemImpactEntity {
  return { id, nodeId: `sys:${id}`, label: id, kind: 'component', moduleId: null, reason: null, graphReason: null, evidenceRefs: [], evidenceSummary: null, ...extra }
}
const reviewed = (id: string, status: string): ReviewedSystemEntity => ({ ...entity(id), status })

const affected = [entity('page'), entity('api')]
const reviewedList = [reviewed('db', 'reviewed-not-affected'), reviewed('flag', 'unknown')]

describe('impact summary consistency', () => {
  it('every counted entity is present as a row (AC8–AC10)', () => {
    const rows = buildImpactRows(affected, reviewedList)
    const counts = impactCounts(affected, reviewedList)
    expect(rows.length).toBe(counts.total)
    expect(rows.length).toBe(affected.length + reviewedList.length)
    // Counts partition exactly matches the rows by status.
    expect(rows.filter((r) => r.status === 'affected').length).toBe(counts.affected)
    expect(rows.filter((r) => r.status === 'reviewed-not-affected').length).toBe(counts.reviewedNotAffected)
    expect(rows.filter((r) => r.status === 'unknown').length).toBe(counts.unknown)
  })

  it('affected entities are tagged with an "affected" status', () => {
    const rows = buildImpactRows(affected, [])
    expect(rows.every((r) => r.status === 'affected')).toBe(true)
  })

  it('unknown is preserved as its own bucket, never merged into reviewed', () => {
    const counts = impactCounts([], [reviewed('x', 'unknown'), reviewed('y', 'reviewed-not-affected')])
    expect(counts.unknown).toBe(1)
    expect(counts.reviewedNotAffected).toBe(1)
  })
})

describe('coverage notice', () => {
  it('is null when coverage is available (no false completeness claim)', () => {
    expect(coverageNotice('available')).toBeNull()
  })
  it('warns on partial coverage and never claims completeness', () => {
    const n = coverageNotice('partial')!
    expect(n.level).toBe('partial')
    expect(n.body).toMatch(/do not imply/i)
    expect(n.body).not.toMatch(/complete|100%|all affected/i)
  })
  it('explains the unavailable case as repository-only', () => {
    const n = coverageNotice('unavailable')!
    expect(n.level).toBe('unavailable')
    expect(n.body).toMatch(/repository and Knowledge only/)
  })
})

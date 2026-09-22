import type { SystemImpactEntity, ReviewedSystemEntity, GraphCoverage } from './api'

// Pure impact-view logic shared by the Work Item SYSTEM IMPACT section and the System Explorer
// overlay (VS-101.1). Kept out of the components so the summary-consistency and coverage-warning
// invariants can be unit-tested against the exact logic the UI renders.

/** A displayable impact row: every entity carries a status ('affected' for affected entities). */
export type ImpactRow = ReviewedSystemEntity

/** Every counted entity becomes a row, so summary counts always match what is visible (AC8–AC10). */
export function buildImpactRows(affected: SystemImpactEntity[], reviewed: ReviewedSystemEntity[]): ImpactRow[] {
  return [...affected.map((e): ImpactRow => ({ ...e, status: 'affected' })), ...reviewed]
}

export type ImpactCounts = { affected: number; reviewedNotAffected: number; unknown: number; total: number }

export function impactCounts(affected: SystemImpactEntity[], reviewed: ReviewedSystemEntity[]): ImpactCounts {
  const reviewedNotAffected = reviewed.filter((r) => r.status !== 'unknown').length
  const unknown = reviewed.filter((r) => r.status === 'unknown').length
  return { affected: affected.length, reviewedNotAffected, unknown, total: affected.length + reviewed.length }
}

export type CoverageNotice = { level: 'partial' | 'unavailable'; title: string; body: string }

/**
 * The partial/unavailable coverage warning. Never claims completeness; a missing edge is never
 * presented as proof of no impact. Returns null when coverage is 'available' (no warning needed).
 */
export function coverageNotice(coverage: GraphCoverage): CoverageNotice | null {
  if (coverage === 'partial') {
    return {
      level: 'partial',
      title: 'Graph coverage: Partial',
      body: 'This assessment uses the topology currently known by Kaddo. Missing Graph relationships do not imply that other parts of the system are unaffected.',
    }
  }
  if (coverage === 'unavailable') {
    return {
      level: 'unavailable',
      title: 'Graph coverage: Unavailable',
      body: 'No semantic topology is available for this project. Impact was assessed from the repository and Knowledge only.',
    }
  }
  return null
}

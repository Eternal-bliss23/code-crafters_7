import { rubricCriteriaByNOS } from '../data/qp';
import type {
  CertificationRecommendation,
  CompetencyProfile,
  CompetencyStatus,
  NOSResult,
  QualificationPack,
  RubricCriterion,
  ScoreLevel,
  TaskAssessment
} from '../types';
import { round } from '../lib/format';

/** Pass marks (normalised 0..1) and the critical-criterion floor. */
export const PASS_THRESHOLD = 0.7;
export const PROFICIENT_THRESHOLD = 0.85;
export const CRITICAL_FLOOR: ScoreLevel = 2;

export const BOUNDARY_NOTICE =
  'This tool produces a competency profile and a certification *recommendation*. It supports the assessor; it does not replace the assessor\u2019s decision. The qualified assessor reviews the evidence, may override any AI-suggested score, and is solely responsible for the final certification decision recorded against the worker.';

function statusFor(normalized: number, failedCritical: string[]): CompetencyStatus {
  if (failedCritical.length > 0) return 'not_yet_competent';
  if (normalized >= PROFICIENT_THRESHOLD) return 'proficient';
  if (normalized >= PASS_THRESHOLD) return 'competent';
  return 'not_yet_competent';
}

function weightedNormalized(
  criteria: RubricCriterion[],
  scoresById: Map<string, ScoreLevel>
): number {
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = criteria.reduce((s, c) => s + c.weight * ((scoresById.get(c.id) ?? 0) / 3), 0);
  return earned / totalWeight;
}

/** Flatten all criterion scores for a QP's tasks into one lookup. */
export function flattenScores(
  qp: QualificationPack,
  tasks: Record<string, TaskAssessment>
): Map<string, ScoreLevel> {
  const map = new Map<string, ScoreLevel>();
  for (const task of qp.tasks) {
    const ta = tasks[task.id];
    if (!ta) continue;
    for (const cs of ta.scores) {
      map.set(cs.criterionId, cs.level);
    }
  }
  return map;
}

export function computeCompetencyProfile(
  qp: QualificationPack,
  tasks: Record<string, TaskAssessment>
): CompetencyProfile {
  const grouped = rubricCriteriaByNOS(qp);
  const scores = flattenScores(qp, tasks);
  const nosResults: NOSResult[] = [];
  const gaps: string[] = [];

  for (const nos of qp.nos) {
    const criteria = grouped[nos.id] ?? [];
    const failedCritical = criteria
      .filter((c) => c.critical && (scores.get(c.id) ?? 0) < CRITICAL_FLOOR)
      .map((c) => c.label);
    const normalized = weightedNormalized(criteria, scores);
    const status = criteria.length === 0
      ? 'not_assessed'
      : statusFor(normalized, failedCritical);

    if (status !== 'competent' && status !== 'proficient') {
      const weak = criteria
        .filter((c) => (scores.get(c.id) ?? 0) < CRITICAL_FLOOR)
        .map((c) => c.label);
      for (const label of weak.length ? weak : failedCritical) {
        gaps.push(`${nos.code}: ${label}`);
      }
    }

    nosResults.push({
      nosId: nos.id,
      code: nos.code,
      title: nos.title,
      rawScore: round(normalized * 3, 2),
      normalized: round(normalized, 3),
      status,
      failedCritical
    });
  }

  const allCriteria = qp.tasks.flatMap((t) => t.rubric);
  const overallNormalized = weightedNormalized(allCriteria, scores);
  const failedCriticalAll = allCriteria
    .filter((c) => c.critical && (scores.get(c.id) ?? 0) < CRITICAL_FLOOR)
    .map((c) => c.label);
  const overallStatus = statusFor(overallNormalized, failedCriticalAll);

  return {
    qpId: qp.id,
    qpTitle: qp.title,
    nsqfLevel: qp.nsqfLevel,
    overallNormalized: round(overallNormalized, 3),
    overallStatus,
    nos: nosResults,
    gaps: [...new Set(gaps)]
  };
}

export interface RecommendationOptions {
  /** Fraction (0..1) of tasks for which any evidence was captured. */
  evidenceRatio?: number;
  /** True when the assessor has explicitly reviewed the profile. */
  assessorReviewed?: boolean;
}

export function generateRecommendation(
  profile: CompetencyProfile,
  opts: RecommendationOptions = {}
): CertificationRecommendation {
  const evidenceRatio = opts.evidenceRatio ?? 0;
  const rationale: string[] = [];
  const conditions: string[] = [];

  const criticalFailures = profile.nos.flatMap((n) => n.failedCritical);
  const weakNOS = profile.nos.filter(
    (n) => n.status !== 'competent' && n.status !== 'proficient' && n.status !== 'not_assessed'
  );

  rationale.push(
    `Weighted performance across all rubric criteria: ${(profile.overallNormalized * 100).toFixed(1)}% (pass mark ${(PASS_THRESHOLD * 100).toFixed(0)}%).`
  );
  if (criticalFailures.length === 0) {
    rationale.push('All critical safety and workmanship criteria met the minimum floor.');
  } else {
    rationale.push(
      `${criticalFailures.length} critical criteria fell below the minimum floor: ${criticalFailures.slice(0, 4).join('; ')}${criticalFailures.length > 4 ? ' ...' : ''}.`
    );
  }
  rationale.push(
    `Evidence captured for ${(evidenceRatio * 100).toFixed(0)}% of practical tasks.`
  );

  let decision: CertificationRecommendation['decision'];
  let confidence: number;

  if (profile.overallStatus === 'not_yet_competent' || criticalFailures.length > 0) {
    decision = 'not_yet';
    confidence = round(0.55 + 0.25 * evidenceRatio, 2);
    conditions.push('Address the listed gaps and re-assess the affected NOS.');
    conditions.push('Critical safety criteria must reach at least "Competent" (level 2).');
  } else if (weakNOS.length === 0 && evidenceRatio >= 0.6) {
    decision = 'recommend';
    const margin = profile.overallNormalized - PASS_THRESHOLD;
    confidence = round(Math.min(0.97, 0.6 + margin * 1.2 + 0.2 * evidenceRatio), 2);
    conditions.push('Assessor to verify identity and evidence authenticity before sign-off.');
  } else {
    decision = 'recommend_with_gaps';
    confidence = round(0.5 + 0.3 * evidenceRatio, 2);
    if (weakNOS.length) {
      conditions.push(
        `Borderline NOS to confirm with the worker: ${weakNOS.map((n) => n.code).join(', ')}.`
      );
    }
    if (evidenceRatio < 0.6) {
      conditions.push('Capture additional photo/video evidence before final sign-off.');
    }
  }

  if (!opts.assessorReviewed) {
    conditions.push('Assessor review and electronic sign-off still pending.');
  }

  return {
    decision,
    confidence,
    rationale,
    conditions,
    boundaryNotice: BOUNDARY_NOTICE
  };
}

export function evidenceRatioFor(
  qp: QualificationPack,
  tasks: Record<string, TaskAssessment>
): number {
  if (qp.tasks.length === 0) return 0;
  const withEvidence = qp.tasks.filter((t) => (tasks[t.id]?.evidenceIds?.length ?? 0) > 0).length;
  return withEvidence / qp.tasks.length;
}

export function statusLabel(status: CompetencyStatus): string {
  switch (status) {
    case 'competent':
      return 'Competent';
    case 'proficient':
      return 'Proficient';
    case 'not_yet_competent':
      return 'Not yet competent';
    default:
      return 'Not assessed';
  }
}

import { describe, expect, it } from 'vitest';
import { QUALIFICATION_PACKS } from '../data/qp';
import {
  computeCompetencyProfile,
  evidenceRatioFor,
  generateRecommendation
} from './scoring';
import type { Assessment, QualificationPack, ScoreLevel, TaskAssessment } from '../types';

const qp = QUALIFICATION_PACKS.find((q) => q.id === 'ELE-Q0101') as QualificationPack;

function scoreAll(level: ScoreLevel, override?: Record<string, ScoreLevel>): Record<string, TaskAssessment> {
  const tasks: Record<string, TaskAssessment> = {};
  for (const task of qp.tasks) {
    tasks[task.id] = {
      taskId: task.id,
      scores: task.rubric.map((c) => ({ criterionId: c.id, level: override?.[c.id] ?? level })),
      evidenceIds: [],
      completed: true
    };
  }
  return tasks;
}

describe('scoring engine', () => {
  it('returns proficient and a recommend decision when all criteria are 3', () => {
    const profile = computeCompetencyProfile(qp, scoreAll(3));
    expect(profile.overallNormalized).toBeCloseTo(1, 3);
    expect(profile.overallStatus).toBe('proficient');
    const rec = generateRecommendation(profile, { evidenceRatio: 1, assessorReviewed: true });
    expect(rec.decision).toBe('recommend');
    expect(rec.confidence).toBeGreaterThan(0.7);
  });

  it('returns not-yet-competent when all criteria are 0', () => {
    const profile = computeCompetencyProfile(qp, scoreAll(0));
    expect(profile.overallStatus).toBe('not_yet_competent');
    const rec = generateRecommendation(profile, { evidenceRatio: 0.5 });
    expect(rec.decision).toBe('not_yet');
    expect(rec.rationale.join(' ')).toMatch(/critical criteria/i);
  });

  it('fails a NOS when a critical criterion is below the floor even if other scores are high', () => {
    const profile = computeCompetencyProfile(qp, scoreAll(3, { 'ELE-T1-r2': 1 }));
    const nos = profile.nos.find((n) => n.nosId === 'ELE-N0102');
    expect(nos?.status).toBe('not_yet_competent');
    expect(nos?.failedCritical.length).toBeGreaterThan(0);
    const rec = generateRecommendation(profile, { evidenceRatio: 1 });
    expect(rec.decision).toBe('not_yet');
  });

  it('recommends with gaps when borderline and evidence is thin', () => {
    const profile = computeCompetencyProfile(qp, scoreAll(2, { 'ELE-T1-r1': 1 }));
    const rec = generateRecommendation(profile, { evidenceRatio: 0.3 });
    expect(['recommend_with_gaps', 'not_yet']).toContain(rec.decision);
    expect(rec.conditions.length).toBeGreaterThan(0);
  });

  it('computes evidence coverage across tasks', () => {
    const tasks = scoreAll(2);
    const firstTwo = qp.tasks.slice(0, 2).map((t) => t.id);
    for (const id of firstTwo) tasks[id].evidenceIds = ['ev1'];
    const ratio = evidenceRatioFor(qp, tasks);
    expect(ratio).toBeCloseTo(2 / qp.tasks.length, 5);
  });

  it('always states the support-vs-replace boundary', () => {
    const profile = computeCompetencyProfile(qp, scoreAll(2));
    const rec = generateRecommendation(profile);
    expect(rec.boundaryNotice).toMatch(/supports the assessor/i);
  });
});

// A small type guard so the test file type-checks against the Assessment shape when extended.
export type _AssessmentShape = Assessment;

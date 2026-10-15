import { describe, expect, it } from 'vitest';
import { QUALIFICATION_PACKS } from '../data/qp';
import { buildAgreementCases, cohensKappa, fleissKappa, runAgreementStudy } from './agreement';
import type { QualificationPack } from '../types';

const qp = QUALIFICATION_PACKS.find((q) => q.id === 'ELE-Q0101') as QualificationPack;

describe('agreement harness', () => {
  it('reports perfect agreement for identical ratings', () => {
    const items = [
      [2, 2, 2, 2],
      [3, 3, 3, 3],
      [1, 1, 1, 1]
    ];
    expect(fleissKappa(items, 4)).toBeCloseTo(1, 5);
    expect(cohensKappa([2, 3, 1], [2, 3, 1])).toBeCloseTo(1, 5);
  });

  it('builds a test set covering every rubric criterion', () => {
    const cases = buildAgreementCases(qp);
    expect(cases.length).toBeGreaterThan(0);
    expect(Object.keys(cases[0].expert).length).toBe(qp.tasks[0].rubric.length);
  });

  it('shows improved agreement and lower error for rubric-assisted scoring', () => {
    const result = runAgreementStudy(qp, { assessors: 5 });
    expect(result.assisted.percentAgreement).toBeGreaterThan(result.unassisted.percentAgreement);
    expect(result.assisted.fleissKappa).toBeGreaterThan(result.unassisted.fleissKappa);
    expect(result.assisted.meanAbsError).toBeLessThan(result.unassisted.meanAbsError);
  });
});

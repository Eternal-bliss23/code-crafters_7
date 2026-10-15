import { describe, expect, it } from 'vitest';
import { buildProfile, estimateNSQFLevel, mapToQualificationPacks } from './mapping';
import type { SelfDeclarationAnswers } from '../types';

const domestic: SelfDeclarationAnswers = {
  yearsExperience: 'y3-5',
  learningRoute: 'onthejob',
  activities: ['a-wiring', 'a-lighting', 'a-db', 'a-earthing', 'a-fault', 'a-termination', 'a-conduit', 'a-safety'],
  tools: ['t-basic', 't-multimeter', 't-insulation', 't-ppe'],
  priorCredential: 'none',
  taskComplexity: 'c-independent',
  tradeFocus: 'domestic'
};

const solar: SelfDeclarationAnswers = {
  yearsExperience: 'y3-5',
  learningRoute: 'onthejob',
  activities: ['a-solar', 'a-inverter', 'a-earthing', 'a-safety', 'a-termination'],
  tools: ['t-basic', 't-multimeter', 't-insulation'],
  priorCredential: 'none',
  taskComplexity: 'c-independent',
  tradeFocus: 'solar'
};

const industrial: SelfDeclarationAnswers = {
  yearsExperience: 'y5-10',
  learningRoute: 'helper',
  activities: ['a-panel', 'a-motor', 'a-fault', 'a-safety'],
  tools: ['t-multimeter', 't-clamp', 't-ppe', 't-dmm-analog'],
  priorCredential: 'helper',
  taskComplexity: 'c-lead',
  tradeFocus: 'industrial'
};

describe('mapping engine', () => {
  it('maps a domestic electrician to the Electrician L3 pack', () => {
    const { matches } = mapToQualificationPacks(domestic);
    expect(matches[0].qpId).toBe('ELE-Q0101');
    expect(matches[0].confidence).toBe('high');
  });

  it('maps a solar worker to the Solar PV pack', () => {
    const { matches } = mapToQualificationPacks(solar);
    expect(matches[0].qpId).toBe('SOL-Q0201');
  });

  it('maps an industrial worker to the panel technician pack', () => {
    const { matches } = mapToQualificationPacks(industrial);
    expect(matches[0].qpId).toBe('ELE-Q0301');
  });

  it('ranks matches in descending score order', () => {
    const { matches } = mapToQualificationPacks(domestic);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it('estimates a higher NSQF level for more experienced workers', () => {
    const junior = buildProfile({ ...domestic, yearsExperience: 'lt1', taskComplexity: 'c-basic' });
    const senior = buildProfile({ ...domestic, yearsExperience: 'gt10', taskComplexity: 'c-lead' });
    expect(estimateNSQFLevel(senior)).toBeGreaterThanOrEqual(estimateNSQFLevel(junior));
  });
});

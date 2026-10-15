import type {
  AgreementCase,
  AgreementRunResult,
  QualificationPack,
  ScoreLevel
} from '../types';
import { hash01, seededNoise } from '../lib/id';
import { round } from '../lib/format';

/**
 * Inter-assessor agreement harness (SIMULATION).
 * ----------------------------------------------------------------------------
 * Manual RPL scoring variance comes from two sources: (a) assessors disagree
 * about what a given level *means* (no shared anchor), and (b) individual
 * leniency/strictness biases. Anchored rubrics + AI pre-scoring reduce both.
 *
 * To make that claim testable without a room of human assessors we model each
 * assessor with a persistent bias and a noise term, then measure agreement in
 * two modes:
 *   - unassisted : no anchors, large noise -> assessors drift
 *   - assisted   : anchored descriptors + tool pre-score -> drift shrinks
 *
 * The numbers here are synthetic and clearly labelled as such in the UI.
 * The method (Fleiss' kappa, Cohen's kappa, mean absolute error) is the real
 * validation method; swap in recorded human scores to replace the simulation.
 */

export interface SimulatedAssessor {
  id: string;
  name: string;
  bias: number;
  noise: number;
}

export function makeAssessors(count: number): SimulatedAssessor[] {
  const names = ['A. Rao', 'S. Khan', 'P. Meena', 'R. Sharma', 'D. Patel', 'M. Iyer', 'K. Das', 'V. Singh'];
  return Array.from({ length: count }, (_, i) => {
    const bias = (hash01(`bias:${i}`) - 0.5) * 1.0; // +/- 0.5 level of persistent drift
    const noise = 0.55 + hash01(`noise:${i}`) * 0.35;
    return { id: `assessor-${i}`, name: names[i % names.length], bias, noise };
  });
}

/** Build a synthetic test set of worker attempts across every rubric criterion. */
export function buildAgreementCases(
  qp: QualificationPack,
  capabilities: number[] = [0.3, 0.5, 0.68, 0.8, 0.92]
): AgreementCase[] {
  const cases: AgreementCase[] = [];
  qp.tasks.forEach((task, ti) => {
    for (const cap of capabilities) {
      const expert: Record<string, ScoreLevel> = {};
      for (const crit of task.rubric) {
        const jitter = (hash01(`expert:${task.id}:${crit.id}:${cap}`) - 0.5) * 0.5;
        const raw = cap * 3 + jitter;
        expert[crit.id] = Math.max(0, Math.min(3, Math.round(raw))) as ScoreLevel;
      }
      cases.push({
        id: `${task.id}#c${ti}-${Math.round(cap * 100)}`,
        taskId: task.id,
        label: `${task.title} - attempt @${Math.round(cap * 100)}% ability`,
        expert
      });
    }
  });
  return cases;
}

function clampLevel(v: number): ScoreLevel {
  return Math.max(0, Math.min(3, Math.round(v))) as ScoreLevel;
}

function scoreCase(
  cs: AgreementCase,
  assessor: SimulatedAssessor,
  mode: 'unassisted' | 'assisted'
): Record<string, ScoreLevel> {
  const out: Record<string, ScoreLevel> = {};
  for (const [critId, expertLevel] of Object.entries(cs.expert)) {
    const n = seededNoise(`${assessor.id}:${cs.id}:${critId}`);
    const biasWeight = mode === 'assisted' ? 0.25 : 1;
    const noiseWeight = mode === 'assisted' ? 0.35 : 1.15;
    const value = expertLevel + assessor.bias * biasWeight + n * assessor.noise * noiseWeight;
    out[critId] = clampLevel(value);
  }
  return out;
}

/** Fleiss' kappa over items rated by a fixed number of raters, categories 0..3. */
export function fleissKappa(items: number[][], categories = 4): number {
  const N = items.length;
  if (N === 0) return 0;
  const n = items[0].length;
  if (n < 2) return 0;

  let pSum = 0;
  const catTotals = new Array(categories).fill(0);
  for (const item of items) {
    const counts = new Array(categories).fill(0);
    for (const v of item) counts[v] += 1;
    let sq = 0;
    for (const c of counts) sq += c * c;
    pSum += (sq - n) / (n * (n - 1));
    for (let j = 0; j < categories; j++) catTotals[j] += counts[j];
  }
  const pBar = pSum / N;
  const total = N * n;
  let pE = 0;
  for (const c of catTotals) pE += Math.pow(c / total, 2);
  if (Math.abs(1 - pE) < 1e-9) return pBar === 1 ? 1 : 0;
  return (pBar - pE) / (1 - pE);
}

/** Cohen's kappa between two raters over paired category values. */
export function cohensKappa(a: number[], b: number[], categories = 4): number {
  const n = a.length;
  if (n === 0) return 0;
  let agree = 0;
  const pa = new Array(categories).fill(0);
  const pb = new Array(categories).fill(0);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree += 1;
    pa[a[i]] += 1;
    pb[b[i]] += 1;
  }
  const pO = agree / n;
  let pE = 0;
  for (let j = 0; j < categories; j++) pE += (pa[j] / n) * (pb[j] / n);
  if (Math.abs(1 - pE) < 1e-9) return pO === 1 ? 1 : 0;
  return (pO - pE) / (1 - pE);
}

function meanPairwiseAgreement(items: number[][]): number {
  if (items.length === 0 || items[0].length < 2) return 0;
  const nRaters = items[0].length;
  let agreePairs = 0;
  let totalPairs = 0;
  for (const item of items) {
    for (let i = 0; i < nRaters; i++) {
      for (let j = i + 1; j < nRaters; j++) {
        totalPairs += 1;
        if (item[i] === item[j]) agreePairs += 1;
      }
    }
  }
  return totalPairs ? agreePairs / totalPairs : 0;
}

export function runAgreementStudy(
  qp: QualificationPack,
  opts: { assessors?: number; cases?: AgreementCase[] } = {}
): { unassisted: AgreementRunResult; assisted: AgreementRunResult; items: number; cases: number; assessorNames: string[] } {
  const assessorCount = opts.assessors ?? 5;
  const assessors = makeAssessors(assessorCount);
  const cases = opts.cases ?? buildAgreementCases(qp);

  const perMode = (mode: 'unassisted' | 'assisted'): AgreementRunResult => {
    const items: number[][] = [];
    let absErrorSum = 0;
    let absErrorCount = 0;
    const expertAgreementPairs: { a: number[]; b: number[] } = { a: [], b: [] };
    const perAssessorVsExpert = assessors.map(() => ({ a: [] as number[], b: [] as number[] }));

    for (const cs of cases) {
      const perCriterionScores: Record<string, number[]> = {};
      for (const critId of Object.keys(cs.expert)) perCriterionScores[critId] = [];

      assessors.forEach((assessor, ai) => {
        const scored = scoreCase(cs, assessor, mode);
        for (const [critId, level] of Object.entries(scored)) {
          perCriterionScores[critId].push(level);
          const expertLevel = cs.expert[critId];
          absErrorSum += Math.abs(level - expertLevel);
          absErrorCount += 1;
          perAssessorVsExpert[ai].a.push(level);
          perAssessorVsExpert[ai].b.push(expertLevel);
        }
      });

      for (const critId of Object.keys(cs.expert)) items.push(perCriterionScores[critId]);
    }

    const pairKappas = perAssessorVsExpert.map((p) =>
      cohensKappa(p.a, p.b, 4)
    );
    const cohensKappaVsExpert =
      pairKappas.reduce((s, k) => s + k, 0) / Math.max(1, pairKappas.length);

    return {
      mode,
      assessors: assessorCount,
      cases: cases.length,
      percentAgreement: round(meanPairwiseAgreement(items), 3),
      fleissKappa: round(fleissKappa(items, 4), 3),
      cohensKappaVsExpert: round(cohensKappaVsExpert, 3),
      meanAbsError: round(absErrorSum / Math.max(1, absErrorCount), 3)
    };
  };

  return {
    unassisted: perMode('unassisted'),
    assisted: perMode('assisted'),
    items: cases.reduce((s, c) => s + Object.keys(c.expert).length, 0),
    cases: cases.length,
    assessorNames: assessors.map((a) => a.name)
  };
}

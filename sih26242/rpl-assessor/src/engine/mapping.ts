import { QUALIFICATION_PACKS, getQP } from '../data/qp';
import {
  ACTIVITY_OPTIONS,
  COMPLEXITY_OPTIONS,
  TOOL_OPTIONS,
  TRADE_FOCUS_OPTIONS,
  YEARS_OPTIONS,
  optionById,
  tagLabel,
  tagsForOptionIds
} from '../data/questions';
import type {
  DeclarationProfile,
  MappingReason,
  NSQFLevel,
  QPMatch,
  QualificationPack,
  SelfDeclarationAnswers
} from '../types';
import { round } from '../lib/format';

/** Expected years of experience implied by an NSQF level in this trade family. */
const EXPECTED_YEARS: Record<number, number> = { 2: 1, 3: 3, 4: 5, 5: 7 };

export function buildProfile(a: SelfDeclarationAnswers): DeclarationProfile {
  const activityTags = tagsForOptionIds(ACTIVITY_OPTIONS, a.activities);
  const focusTags = tagsForOptionIds(TRADE_FOCUS_OPTIONS, [a.tradeFocus]);
  const toolTags = tagsForOptionIds(TOOL_OPTIONS, a.tools);
  const tags = [...new Set([...activityTags, ...focusTags])];
  const years = optionById(YEARS_OPTIONS, a.yearsExperience)?.years ?? 0;
  const complexity = optionById(COMPLEXITY_OPTIONS, a.taskComplexity)?.complexity ?? 1;
  return {
    years,
    tags,
    tools: [...new Set(toolTags)],
    complexity,
    hasPriorCredential: a.priorCredential !== 'none',
    tradeFocus: a.tradeFocus
  };
}

/**
 * Estimate the NSQF level a worker's self-declaration most plausibly sits at.
 * Blends the highest task complexity they report with years of experience.
 */
export function estimateNSQFLevel(profile: DeclarationProfile): NSQFLevel {
  const yearLevel = profile.years >= 5 ? 4 : profile.years >= 2 ? 3 : 2;
  const blended = Math.round((profile.complexity + yearLevel) / 2);
  const clamped = Math.max(2, Math.min(5, blended));
  return clamped as NSQFLevel;
}

function coverage(matched: number, required: number): number {
  if (required <= 0) return 0;
  return Math.min(1, matched / required);
}

export function scoreQPForProfile(qp: QualificationPack, profile: DeclarationProfile): QPMatch {
  const workerTagSet = new Set(profile.tags);
  const qpTags = qp.tags;
  const matchedTags = qpTags.filter((t) => workerTagSet.has(t));
  const missingTags = qpTags.filter((t) => !workerTagSet.has(t));

  const tagCoverage = coverage(matchedTags.length, qpTags.length);
  const workerSpecificity =
    profile.tags.length > 0 ? matchedTags.length / profile.tags.length : 0;

  const workerToolSet = new Set(profile.tools);
  const qpToolHits = qpTags.filter((t) =>
    workerToolSet.has(t) || [...workerToolSet].some((wt) => wt === t)
  ).length;
  const toolAlignment = coverage(qpToolHits, Math.min(6, qpTags.length));

  const expectedYears = EXPECTED_YEARS[qp.nsqfLevel] ?? 3;
  const experienceFit = Math.min(1, profile.years / expectedYears);
  const levelFit = 1 - Math.min(1, Math.abs(profile.complexity - qp.nsqfLevel) / 3);

  const reasons: MappingReason[] = [
    {
      label: 'Skill coverage',
      detail: `${matchedTags.length} of ${qpTags.length} pack skills evidenced${matchedTags.length ? `: ${matchedTags.slice(0, 6).map(tagLabel).join(', ')}${matchedTags.length > 6 ? ', ...' : ''}` : ''}`,
      contribution: round(0.62 * tagCoverage, 3)
    },
    {
      label: 'Tool & instrument alignment',
      detail: `${workerToolSet.size} tools/instruments declared`,
      contribution: round(0.1 * toolAlignment, 3)
    },
    {
      label: 'Experience fit',
      detail: `${profile.years} year(s) vs ~${expectedYears} expected for NSQF ${qp.nsqfLevel}`,
      contribution: round(0.12 * experienceFit, 3)
    },
    {
      label: 'Task complexity fit',
      detail: `Reported complexity level ${profile.complexity} vs pack level ${qp.nsqfLevel}`,
      contribution: round(0.16 * levelFit, 3)
    },
    {
      label: 'Declared work specificity',
      detail: `${matchedTags.length} of ${profile.tags.length} declared skills used by this pack`,
      contribution: round(0.0 * workerSpecificity, 3)
    }
  ];

  const score = reasons.reduce((s, r) => s + r.contribution, 0);
  const confidence: QPMatch['confidence'] = score >= 0.62 ? 'high' : score >= 0.4 ? 'medium' : 'low';

  return {
    qpId: qp.id,
    score: round(score, 3),
    confidence,
    reasons,
    matchedTags,
    missingTags
  };
}

export function mapToQualificationPacks(answers: SelfDeclarationAnswers): {
  profile: DeclarationProfile;
  matches: QPMatch[];
  estimatedLevel: NSQFLevel;
} {
  const profile = buildProfile(answers);
  const matches = QUALIFICATION_PACKS.map((qp) => scoreQPForProfile(qp, profile)).sort(
    (a, b) => b.score - a.score
  );
  return { profile, matches, estimatedLevel: estimateNSQFLevel(profile) };
}

export function topMatch(matches: QPMatch[]): QPMatch | undefined {
  return matches[0];
}

export function matchQualityLabel(match: QPMatch): string {
  if (match.score >= 0.62) return 'Strong match';
  if (match.score >= 0.4) return 'Possible match';
  return 'Weak match';
}

/** Convenience for the UI: which tags of a pack the worker did NOT evidence. */
export function gapTags(qpId: string, matches: QPMatch[]): string[] {
  return matches.find((m) => m.qpId === qpId)?.missingTags ?? [];
}

export { getQP };

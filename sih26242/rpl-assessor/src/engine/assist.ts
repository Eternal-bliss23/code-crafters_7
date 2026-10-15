import type { RubricCriterion, ScoreLevel } from '../types';

/**
 * Rule-based assistive pre-score.
 * ----------------------------------------------------------------------------
 * This is a transparent, rule-based helper - NOT a trained vision model. It
 * reads factual signals the system already has (was evidence captured, is the
 * criterion critical, is it observable) and proposes a starting level with an
 * explanation. The assessor sees the rationale and can accept or override.
 *
 * It is deliberately conservative: with no evidence it defaults low rather than
 * guessing high, and it never marks a critical criterion competent without
 * evidence. Swap this function for a trained model behind the same interface
 * once labelled assessor data exists; the rest of the app does not change.
 */

export interface AssistSuggestion {
  level: ScoreLevel;
  confidence: number;
  rationale: string[];
  evidenceBased: boolean;
}

export interface AssistInput {
  criterion: RubricCriterion;
  hasEvidence: boolean;
  evidenceCount: number;
}

export function suggestScore({ criterion, hasEvidence, evidenceCount }: AssistInput): AssistSuggestion {
  const rationale: string[] = [];
  let level: ScoreLevel;
  let confidence: number;

  if (hasEvidence && evidenceCount >= 1) {
    level = evidenceCount >= 2 ? 3 : 2;
    confidence = evidenceCount >= 2 ? 0.55 : 0.45;
    rationale.push(`${evidenceCount} evidence item(s) captured for this task.`);
    rationale.push('Evidence present supports a competent-level starting score.');
  } else if (!criterion.critical) {
    level = 1;
    confidence = 0.3;
    rationale.push('No evidence captured; defaulting to "Partially performed".');
  } else {
    level = 1;
    confidence = 0.25;
    rationale.push('Critical criterion with no evidence: cannot be marked competent on a suggestion.');
    rationale.push('Assessor must observe and score this criterion directly.');
  }

  if (criterion.critical) {
    rationale.push('Flagged critical: a human decision is required for sign-off.');
    confidence = Math.min(confidence, 0.5);
  }
  if (!criterion.observable) {
    rationale.push('Criterion is not directly observable from evidence; rely on interview/observation.');
  }

  return { level, confidence, rationale, evidenceBased: hasEvidence };
}

export function levelName(level: ScoreLevel): string {
  return ['Not performed', 'Partially performed', 'Competent', 'Proficient'][level];
}

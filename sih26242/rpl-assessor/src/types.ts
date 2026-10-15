export type NSQFLevel = 2 | 3 | 4 | 5;

export type CompetencyStatus = 'not_assessed' | 'not_yet_competent' | 'competent' | 'proficient';

export type EvidenceType = 'photo' | 'video' | 'audio' | 'measurement' | 'observation';

/** A single observable performance criterion inside a National Occupational Standard. */
export interface PerformanceCriterion {
  id: string;
  text: string;
  /** Relative weight within its NOS. */
  weight: number;
  /** Critical criteria must reach at least level 2 ("Competent") to pass the NOS. */
  critical?: boolean;
  /** True when the criterion can be supported by captured evidence. */
  observable?: boolean;
}

export interface NOS {
  id: string;
  code: string;
  title: string;
  description: string;
  criteria: PerformanceCriterion[];
}

/** Anchored descriptors for a rubric criterion, index = score level 0..3. */
export interface RubricLevels {
  labels: [string, string, string, string];
  descriptors: [string, string, string, string];
}

export interface RubricCriterion {
  id: string;
  label: string;
  nosId: string;
  weight: number;
  critical?: boolean;
  observable?: boolean;
  levels: RubricLevels;
}

export interface PracticalTask {
  id: string;
  nosId: string;
  title: string;
  instruction: string;
  /** Preferred evidence to assist the assessor. */
  evidenceType: EvidenceType;
  rubric: RubricCriterion[];
}

export interface QualificationPack {
  id: string;
  code: string;
  title: string;
  nsqfLevel: NSQFLevel;
  sector: string;
  description: string;
  indicativeHours: number;
  /** Skill tags used by the mapping engine. */
  tags: string[];
  nos: NOS[];
  tasks: PracticalTask[];
}

/* ------------------------------------------------------------------ */
/* Self-declaration                                                    */
/* ------------------------------------------------------------------ */

export interface SelfDeclarationAnswers {
  yearsExperience: string;
  learningRoute: string;
  activities: string[];
  tools: string[];
  priorCredential: string;
  taskComplexity: string;
  tradeFocus: string;
}

export interface DeclarationProfile {
  years: number;
  tags: string[];
  tools: string[];
  complexity: number;
  hasPriorCredential: boolean;
  tradeFocus: string;
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

export interface MappingReason {
  label: string;
  detail: string;
  contribution: number;
}

export interface QPMatch {
  qpId: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  reasons: MappingReason[];
  matchedTags: string[];
  missingTags: string[];
}

/* ------------------------------------------------------------------ */
/* Assessment / scoring                                                */
/* ------------------------------------------------------------------ */

export type ScoreLevel = 0 | 1 | 2 | 3;

export interface CriterionScore {
  criterionId: string;
  level: ScoreLevel;
  note?: string;
}

export interface TaskAssessment {
  taskId: string;
  scores: CriterionScore[];
  evidenceIds: string[];
  completed: boolean;
}

export interface NOSResult {
  nosId: string;
  code: string;
  title: string;
  rawScore: number;
  normalized: number;
  status: CompetencyStatus;
  failedCritical: string[];
}

export interface CompetencyProfile {
  qpId: string;
  qpTitle: string;
  nsqfLevel: NSQFLevel;
  overallNormalized: number;
  overallStatus: CompetencyStatus;
  nos: NOSResult[];
  gaps: string[];
}

export type RecommendationDecision = 'recommend' | 'recommend_with_gaps' | 'not_yet';

export interface CertificationRecommendation {
  decision: RecommendationDecision;
  confidence: number;
  rationale: string[];
  conditions: string[];
  /** Explicit statement of the tool's role vs the assessor's authority. */
  boundaryNotice: string;
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export interface EvidenceRecord {
  id: string;
  assessmentId: string;
  taskId: string;
  type: EvidenceType;
  mime: string;
  size: number;
  blob: Blob;
  capturedAt: string;
  note: string;
  synced: boolean;
}

/* ------------------------------------------------------------------ */
/* Persisted assessment                                                */
/* ------------------------------------------------------------------ */

export interface Assessment {
  id: string;
  workerName: string;
  workerId: string;
  trade: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'declared' | 'in_progress' | 'scored' | 'submitted';
  declaration?: SelfDeclarationAnswers;
  selectedQpId?: string;
  matches?: QPMatch[];
  tasks: Record<string, TaskAssessment>;
  notes?: string;
  offlineCreated: boolean;
  synced: boolean;
  assessorName?: string;
  assessorSignedAt?: string;
  assessorOverrides?: string;
}

export interface SyncQueueItem {
  id: string;
  entity: 'assessment' | 'evidence';
  refId: string;
  op: 'upsert' | 'delete';
  queuedAt: string;
  tries: number;
  lastError?: string;
}

/* ------------------------------------------------------------------ */
/* Agreement study                                                     */
/* ------------------------------------------------------------------ */

export interface AgreementCase {
  id: string;
  taskId: string;
  label: string;
  /** Expert / referent score per rubric criterion (0..3). */
  expert: Record<string, ScoreLevel>;
}

export interface AgreementRunResult {
  mode: 'unassisted' | 'assisted';
  assessors: number;
  cases: number;
  percentAgreement: number;
  fleissKappa: number;
  cohensKappaVsExpert: number;
  meanAbsError: number;
}

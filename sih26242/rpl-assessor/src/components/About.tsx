import { Callout, Card } from './ui';
import { BOUNDARY_NOTICE, PASS_THRESHOLD } from '../engine/scoring';

export function About() {
  return (
    <div className="stack doc">
      <Card title="What this tool is">
        <p>
          An AI-assisted Recognition of Prior Learning (RPL) assessment tool for India's informally skilled workforce.
          It guides a worker through a structured self-declaration of prior experience, maps that experience to the
          closest NSQF qualification packs, supports practical skill evaluation with guided checklists and photo/video
          evidence, standardises scoring against anchored rubrics, and produces an NSQF-aligned competency profile and
          certification recommendation - all of which works offline.
        </p>
      </Card>

      <Card title="Where it supports vs replaces the assessor">
        <Callout>
          <strong>Supports (the tool does this):</strong> Interview structure, qualification-pack matching, task and
          evidence organisation, rubric anchoring, an assistive pre-score with an explanation, consistency statistics,
          profile and draft recommendation.
        </Callout>
        <Callout tone="info">
          <strong>Replaces nothing (the human does this):</strong> Judging competence, accepting or overriding every
          score, validating evidence authenticity and worker identity, and the final certification decision.
        </Callout>
        <Callout tone="warn"><strong>Boundary notice.</strong> {BOUNDARY_NOTICE}</Callout>
        <ul>
          <li>The assistive pre-score is transparent and rule-based; it never auto-locks a score.</li>
          <li>Critical safety criteria cannot pass on a suggestion - they require an explicit assessor decision.</li>
          <li>A pass requires a weighted score of at least {(PASS_THRESHOLD * 100).toFixed(0)}% with no critical criterion below level 2.</li>
          <li>Sign-off requires a named assessor and at least one evidence item.</li>
        </ul>
      </Card>

      <Card title="How to validate consistency (the evidence requirement)">
        <ol>
          <li>Assemble a test set of real worker attempts for one trade (the app ships a synthetic test set for the demo).</li>
          <li>Have several assessors score the same set twice: once manually with no rubric, once with this tool.</li>
          <li>Compute pairwise agreement, Fleiss' kappa and Cohen's kappa against a referent assessor (see the Consistency tab).</li>
          <li>The claim holds if tool-assisted kappa is materially higher than unassisted kappa on the same records.</li>
        </ol>
      </Card>

      <Card title="Architecture (all client-side)">
        <ul>
          <li><strong>Engines:</strong> Mapping, rubric scoring, recommendation, agreement - pure TypeScript, unit-tested.</li>
          <li><strong>Offline:</strong> IndexedDB for assessments and evidence blobs, a durable sync queue, and a service worker app-shell cache.</li>
          <li><strong>Sync:</strong> Simulated in-browser transport for the demo, or HTTP REST for field deployment.</li>
          <li><strong>Data:</strong> Qualification-pack content here is illustrative; in production it is the authoritative NSQF QP text pulled from the NCVET/NSDC repository.</li>
        </ul>
      </Card>
    </div>
  );
}

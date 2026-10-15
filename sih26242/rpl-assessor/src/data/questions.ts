export interface Option {
  id: string;
  label: string;
  tags?: string[];
  /** Rough task-complexity level this option implies (1 basic .. 4 advanced). */
  complexity?: number;
  /** Implied years of experience for the experience question. */
  years?: number;
}

export interface Question {
  id: keyof DeclaredFields;
  /** Field this question writes to on the answers object. */
  prompt: string;
  help?: string;
  options: Option[];
}

type DeclaredFields = {
  yearsExperience: string;
  learningRoute: string;
  activities: string[];
  tools: string[];
  priorCredential: string;
  taskComplexity: string;
  tradeFocus: string;
};

export const YEARS_OPTIONS: Option[] = [
  { id: 'lt1', label: 'Less than 1 year', years: 0.5 },
  { id: 'y1-3', label: '1 to 3 years', years: 2 },
  { id: 'y3-5', label: '3 to 5 years', years: 4 },
  { id: 'y5-10', label: '5 to 10 years', years: 7 },
  { id: 'gt10', label: 'More than 10 years', years: 12 }
];

export const ROUTE_OPTIONS: Option[] = [
  { id: 'onthejob', label: 'Learned on the job / as an apprentice' },
  { id: 'family', label: 'Family trade or informal apprenticeship' },
  { id: 'helper', label: 'Started as a helper, picked up skills' },
  { id: 'self', label: 'Self-taught' },
  { id: 'formal', label: 'Some formal or ITI training' }
];

export const ACTIVITY_OPTIONS: Option[] = [
  { id: 'a-wiring', label: 'Domestic house wiring (points, sockets, switches)', tags: ['socket', 'switch', 'wiring', 'conduit', 'cable_selection'], complexity: 3 },
  { id: 'a-lighting', label: 'Light points and two-way / staircase circuits', tags: ['lighting', 'two_way', 'switch', 'wiring'], complexity: 3 },
  { id: 'a-db', label: 'Distribution board / MCB installation', tags: ['distribution_board', 'mcb', 'cable_selection'], complexity: 3 },
  { id: 'a-earthing', label: 'Earthing and earth continuity testing', tags: ['earthing', 'continuity_test', 'multimeter'], complexity: 3 },
  { id: 'a-ir', label: 'Insulation resistance / megger testing', tags: ['insulation_test', 'multimeter', 'retest'], complexity: 4 },
  { id: 'a-fault', label: 'Fault finding and repair of electrical faults', tags: ['fault_diagnosis', 'rectification', 'retest', 'multimeter'], complexity: 4 },
  { id: 'a-termination', label: 'Cable cutting, stripping and termination', tags: ['stripping', 'termination', 'cable_selection'], complexity: 2 },
  { id: 'a-conduit', label: 'Conduit and casing installation', tags: ['conduit'], complexity: 2 },
  { id: 'a-safety', label: 'Isolation, lock-out/tag-out and site safety', tags: ['ppe', 'loto', 'safety', 'hazard_id', 'housekeeping'], complexity: 3 },
  { id: 'a-solar', label: 'Solar PV panel installation and wiring', tags: ['solar_pv', 'mounting', 'dc_wiring', 'inverter', 'commissioning'], complexity: 4 },
  { id: 'a-inverter', label: 'Inverter connection and commissioning', tags: ['inverter', 'commissioning', 'dc_wiring', 'earthing'], complexity: 4 },
  { id: 'a-panel', label: 'Control panel / panel board assembly', tags: ['panel_wiring', 'control_panel', 'contactor', 'three_phase'], complexity: 4 },
  { id: 'a-motor', label: 'Three-phase motor starter wiring and repair', tags: ['three_phase', 'contactor', 'fault_diagnosis', 'retest'], complexity: 4 },
  { id: 'a-rcd', label: 'RCD / ELCB installation and testing', tags: ['rcd_test', 'distribution_board', 'retest'], complexity: 4 }
];

export const TOOL_OPTIONS: Option[] = [
  { id: 't-basic', label: 'Basic hand tools (pliers, strippers, screwdrivers)', tags: ['stripping', 'termination'] },
  { id: 't-multimeter', label: 'Multimeter', tags: ['multimeter', 'fault_diagnosis', 'continuity_test'] },
  { id: 't-insulation', label: 'Insulation tester / megger', tags: ['insulation_test', 'multimeter'] },
  { id: 't-clamp', label: 'Clamp meter', tags: ['multimeter', 'three_phase'] },
  { id: 't-drill', label: 'Drill and power tools', tags: ['conduit', 'mounting'] },
  { id: 't-conduitbender', label: 'Conduit bender / threading tools', tags: ['conduit'] },
  { id: 't-ladder', label: 'Ladder and working-at-height kit', tags: ['mounting', 'safety'] },
  { id: 't-ppe', label: 'PPE (gloves, insulated tools, safety shoes)', tags: ['ppe', 'safety'] },
  { id: 't-dmm-analog', label: 'Wiring diagrams / schematics reading', tags: ['panel_wiring', 'control_panel'] }
];

export const CREDENTIAL_OPTIONS: Option[] = [
  { id: 'none', label: 'No formal certificate' },
  { id: 'helper', label: 'Helper / assistant card or letter' },
  { id: 'iti', label: 'ITI or other training certificate' },
  { id: 'other', label: 'Other trade certificate' }
];

export const COMPLEXITY_OPTIONS: Option[] = [
  { id: 'c-basic', label: 'Only simple, repetitive tasks', complexity: 1 },
  { id: 'c-supervised', label: 'Tasks under supervision', complexity: 2 },
  { id: 'c-independent', label: 'Full tasks independently', complexity: 3 },
  { id: 'c-lead', label: 'Complex tasks and leading others', complexity: 4 }
];

export const TRADE_FOCUS_OPTIONS: Option[] = [
  { id: 'domestic', label: 'Domestic / household electrical work', tags: ['socket', 'switch', 'wiring', 'distribution_board'] },
  { id: 'solar', label: 'Solar and renewable energy', tags: ['solar_pv', 'inverter', 'dc_wiring'] },
  { id: 'industrial', label: 'Industrial panels and motors', tags: ['panel_wiring', 'control_panel', 'three_phase'] },
  { id: 'mixed', label: 'A mix of these' }
];

export const QUESTIONS: Question[] = [
  { id: 'tradeFocus', prompt: 'What kind of electrical work have you mostly done?', options: TRADE_FOCUS_OPTIONS },
  { id: 'yearsExperience', prompt: 'How many years have you worked in this trade?', options: YEARS_OPTIONS },
  { id: 'learningRoute', prompt: 'How did you pick up your skills?', options: ROUTE_OPTIONS },
  { id: 'activities', prompt: 'Which of these have you done regularly?', help: 'Select all that apply. This drives the qualification-pack match.', options: ACTIVITY_OPTIONS },
  { id: 'tools', prompt: 'Which tools and instruments can you use?', help: 'Select all that apply.', options: TOOL_OPTIONS },
  { id: 'priorCredential', prompt: 'Do you hold any certificate for this trade?', options: CREDENTIAL_OPTIONS },
  { id: 'taskComplexity', prompt: 'What is the most complex work you do on your own?', options: COMPLEXITY_OPTIONS }
];

export function optionById(options: Option[], id: string): Option | undefined {
  return options.find((o) => o.id === id);
}

export function tagsForOptionIds(options: Option[], ids: string[]): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    const opt = optionById(options, id);
    opt?.tags?.forEach((t) => set.add(t));
  }
  return [...set];
}

/** Human-readable labels for canonical tags, used in mapping explanations. */
export const TAG_LABELS: Record<string, string> = {
  ppe: 'PPE / insulated tools',
  loto: 'Isolation & lock-out/tag-out',
  safety: 'Safe working practice',
  hazard_id: 'Hazard identification',
  housekeeping: 'Workplace housekeeping',
  cable_selection: 'Cable selection & rating',
  stripping: 'Cable stripping',
  termination: 'Terminations',
  conduit: 'Conduit / casing',
  wiring: 'Wiring',
  colour_code: 'Colour coding & polarity',
  socket: 'Socket outlets',
  switch: 'Switches',
  two_way: 'Two-way circuits',
  lighting: 'Lighting circuits',
  distribution_board: 'Distribution board',
  mcb: 'MCB / protective devices',
  earthing: 'Earthing',
  continuity_test: 'Continuity testing',
  insulation_test: 'Insulation resistance testing',
  rcd_test: 'RCD testing',
  multimeter: 'Multimeter use',
  fault_diagnosis: 'Fault diagnosis',
  rectification: 'Fault rectification',
  retest: 'Re-testing',
  panel_wiring: 'Panel wiring',
  control_panel: 'Control panels',
  contactor: 'Contactor / starter',
  three_phase: 'Three-phase systems',
  solar_pv: 'Solar PV',
  inverter: 'Inverter',
  dc_wiring: 'DC wiring',
  mounting: 'Module mounting',
  commissioning: 'Commissioning',
  // tools
  drill: 'Power tools'
};

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ');
}

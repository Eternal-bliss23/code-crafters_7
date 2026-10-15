import type { NOS, PerformanceCriterion, QualificationPack, RubricCriterion } from '../types';

/**
 * IMPORTANT / HONESTY NOTE
 * ----------------------------------------------------------------------------
 * The qualification-pack content below is *illustrative*, written to mirror the
 * structure and vocabulary of real NSQF Qualification Packs (NOS -> performance
 * criteria -> practical tasks with anchored rubrics). It is intentionally close
 * to the Electrician trade so the demo is credible, but the codes and wording
 * are NOT the official NSQC/NCVET text.
 *
 * In production this data is replaced by the authoritative QP pulled from the
 * NCVET / NSDC QP repository, unmodified. Nothing in the engine depends on
 * these particular strings - only on the schema.
 */

const pc = (
  id: string,
  text: string,
  weight: number,
  extra: Partial<PerformanceCriterion> = {}
): PerformanceCriterion => ({ id, text, weight, observable: true, ...extra });

const rc = (
  id: string,
  nosId: string,
  label: string,
  weight: number,
  levels: [string, string, string, string],
  descriptors: [string, string, string, string],
  critical = false
): RubricCriterion => ({ id, nosId, label, weight, critical, observable: true, levels: { labels: levels, descriptors } });

const ANCHORS: [string, string, string, string] = [
  'Not performed',
  'Partially performed',
  'Competent',
  'Proficient'
];

/* =========================================================================
 * QP 1 - Electrician (Domestic Installation & Maintenance), NSQF Level 3
 * ======================================================================= */

const eleN0101: NOS = {
  id: 'ELE-N0101',
  code: 'ELE/N0101',
  title: 'Maintain a safe, healthy and secure working environment',
  description:
    'Work safely on and around live and isolated electrical installations, identify hazards and comply with workplace safety and statutory requirements.',
  criteria: [
    pc('pc-101-1', 'Use appropriate PPE for the task (insulated gloves, insulated tools, footwear)', 2, { critical: true }),
    pc('pc-101-2', 'Isolate the supply and apply lock-out/tag-out before work', 2, { critical: true }),
    pc('pc-101-3', 'Identify, assess and report workplace hazards', 1),
    pc('pc-101-4', 'Keep the work area organised and clear of tripping hazards', 1)
  ]
};

const eleN0102: NOS = {
  id: 'ELE-N0102',
  code: 'ELE/N0102',
  title: 'Install and maintain domestic wiring and accessories',
  description:
    'Select, prepare, route and terminate conductors and accessories for domestic circuits in line with wiring regulations and manufacturers instructions.',
  criteria: [
    pc('pc-102-1', 'Select the correct cable type and current rating for the load', 2, { critical: true }),
    pc('pc-102-2', 'Measure, cut and strip insulation without damaging conductors', 2),
    pc('pc-102-3', 'Terminate conductors to specification with correct tightness', 2, { critical: true }),
    pc('pc-102-4', 'Route and secure conduit, casing or cable according to the layout', 1),
    pc('pc-102-5', 'Follow colour coding and polarity conventions', 2, { critical: true })
  ]
};

const eleN0103: NOS = {
  id: 'ELE-N0103',
  code: 'ELE/N0103',
  title: 'Install, test and maintain fixtures and protective devices',
  description:
    'Install consumer units, protective devices and earthing, then verify the installation through standard tests.',
  criteria: [
    pc('pc-103-1', 'Install distribution board and protective devices to the layout', 2),
    pc('pc-103-2', 'Connect and verify protective earthing', 2, { critical: true }),
    pc('pc-103-3', 'Perform a continuity test on protective conductors', 2),
    pc('pc-103-4', 'Perform an insulation resistance test and interpret the result', 2, { critical: true }),
    pc('pc-103-5', 'Verify the correct operation of RCD/RCBO protection', 1)
  ]
};

const eleN0104: NOS = {
  id: 'ELE-N0104',
  code: 'ELE/N0104',
  title: 'Diagnose and rectify common electrical faults',
  description:
    'Systematically locate, rectify and re-test faults in domestic electrical circuits.',
  criteria: [
    pc('pc-104-1', 'Isolate the circuit before starting diagnosis', 2, { critical: true }),
    pc('pc-104-2', 'Use a multimeter and insulation tester safely and correctly', 2),
    pc('pc-104-3', 'Identify the root cause rather than the presenting symptom', 2),
    pc('pc-104-4', 'Rectify the fault to the applicable standard', 2),
    pc('pc-104-5', 'Re-test the circuit functionally after repair', 2, { critical: true })
  ]
};

const elecL3: QualificationPack = {
  id: 'ELE-Q0101',
  code: 'ELE/Q0101',
  title: 'Electrician (Domestic Installation & Maintenance)',
  nsqfLevel: 3,
  sector: 'Electrical / Construction',
  indicativeHours: 450,
  description:
    'Installs, tests, maintains and repairs domestic electrical wiring, accessories and protective devices safely and to standard.',
  tags: [
    'ppe', 'loto', 'safety', 'hazard_id', 'housekeeping',
    'cable_selection', 'stripping', 'termination', 'conduit', 'colour_code',
    'socket', 'switch', 'two_way', 'lighting', 'distribution_board',
    'mcb', 'earthing', 'continuity_test', 'insulation_test', 'rcd_test',
    'multimeter', 'fault_diagnosis', 'rectification', 'retest'
  ],
  nos: [eleN0101, eleN0102, eleN0103, eleN0104],
  tasks: [
    {
      id: 'ELE-T1',
      nosId: 'ELE-N0102',
      title: 'Terminate a 3-core cable into a switched socket',
      instruction:
        'Prepare and terminate a 3-core PVC cable into a 13 A switched socket. Capture a clear photo of the finished terminations before closing the accessory.',
      evidenceType: 'photo',
      rubric: [
        rc('ELE-T1-r1', 'ELE-N0102', 'Correct strip length and no nicked/damaged conductors', 2, ANCHORS, [
          'Insulation cut into; strands nicked or missing.',
          'Strip length off; some strand damage but conductor intact.',
          'Correct strip length, conductors clean and undamaged.',
          'Correct strip length, no strand damage, strands twisted neatly.'
        ]),
        rc('ELE-T1-r2', 'ELE-N0102', 'Correct polarity and colour coding (L/N/E)', 2, ANCHORS, [
          'Polarity reversed or earth used as a live conductor.',
          'Colour coding partly wrong or earth unsleeved.',
          'Correct polarity; brown=L, blue=N, green/yellow=E sleeved.',
          'Correct polarity with sleeves, ferrules and clear identification.'
        ], true),
        rc('ELE-T1-r3', 'ELE-N0102', 'Terminations tight, fully inserted, no stray strands', 2, ANCHORS, [
          'Screws loose or conductors not inserted.',
          'One termination loose or strand bridging.',
          'All terminations tight with no stray strands.',
          'Tight, fully inserted, strain relieved and torque-checked.'
        ], true),
        rc('ELE-T1-r4', 'ELE-N0102', 'Mechanical retention and cable sheath inside the accessory', 2, ANCHORS, [
          'Sheath not clamped; cable can be pulled out.',
          'Sheath gripped but slightly short or over-tight.',
          'Outer sheath correctly clamped inside the accessory.',
          'Correct clamping, no compression damage, tidy dressing.'
        ])
      ]
    },
    {
      id: 'ELE-T2',
      nosId: 'ELE-N0102',
      title: 'Wire a two-way lighting circuit on a test board',
      instruction:
        'Wire a two-way staircase lighting circuit between two switches and a lamp. Record a short video showing correct operation from both switch positions.',
      evidenceType: 'video',
      rubric: [
        rc('ELE-T2-r1', 'ELE-N0102', 'Correct strapper/three-core interconnection', 2, ANCHORS, [
          'Strappers wired wrong; circuit does not switch.',
          'Circuit works from one position only.',
          'Correct strappers; lamp switches from both positions.',
          'Correct strappers with neatly dressed and sleeved conductors.'
        ], true),
        rc('ELE-T2-r2', 'ELE-N0102', 'Switched live identified and sleeved', 1, ANCHORS, [
          'No identification on switched live.',
          'Partial identification on one conductor.',
          'Switched live sleeved as per convention.',
          'All conductors identified and sleeved consistently.'
        ]),
        rc('ELE-T2-r3', 'ELE-N0102', 'Safe isolation before and during work', 2, ANCHORS, [
          'Worked live without isolation.',
          'Isolated but did not prove dead / no lock-off.',
          'Isolated, proved dead and locked off before work.',
          'Documented isolation with test-before-touch and lock-off.'
        ], true),
        rc('ELE-T2-r4', 'ELE-N0102', 'Terminations secure at switches and lamp', 2, ANCHORS, [
          'Loose terminations; intermittent operation.',
          'Some terminations loose or over-stripped.',
          'All terminations secure; circuit stable.',
          'Secure, correct strip length, tidy access for maintenance.'
        ])
      ]
    },
    {
      id: 'ELE-T3',
      nosId: 'ELE-N0103',
      title: 'Insulation resistance test on a domestic circuit',
      instruction:
        'Perform an insulation resistance test on a de-energised final circuit. Record the instrument model, test voltage and the reading.',
      evidenceType: 'measurement',
      rubric: [
        rc('ELE-T3-r1', 'ELE-N0103', 'Circuit correctly isolated and disconnected for test', 2, ANCHORS, [
          'Tested while connected / energised.',
          'Isolated but sensitive loads not disconnected.',
          'Circuit isolated and loads disconnected correctly.',
          'Isolation, disconnection and proof-of-dead documented.'
        ], true),
        rc('ELE-T3-r2', 'ELE-N0103', 'Correct instrument, range and test voltage used', 2, ANCHORS, [
          'Wrong instrument or range used.',
          'Correct instrument but incorrect test voltage.',
          'Correct instrument and 500 V DC test voltage applied.',
          'Correct instrumentation with lead zero-check recorded.'
        ]),
        rc('ELE-T3-r3', 'ELE-N0103', 'Reading recorded and correctly interpreted (>= 1 MOhm)', 2, ANCHORS, [
          'No reading recorded.',
          'Reading recorded but not interpreted.',
          'Reading recorded and compared against the 1 MOhm minimum.',
          'Reading recorded, interpreted and trended against prior results.'
        ], true),
        rc('ELE-T3-r4', 'ELE-N0103', 'Safe restoration of the circuit after test', 1, ANCHORS, [
          'Circuit restored with loads still disconnected.',
          'Restored without re-verification.',
          'Loads reconnected and circuit safely restored.',
          'Restored, re-energised and functional confidence check performed.'
        ])
      ]
    },
    {
      id: 'ELE-T4',
      nosId: 'ELE-N0103',
      title: 'Earth continuity test at a socket outlet',
      instruction:
        'Perform an earth continuity test from the distribution board to a socket outlet. Record the instrument reading.',
      evidenceType: 'measurement',
      rubric: [
        rc('ELE-T4-r1', 'ELE-N0103', 'Correct instrument set-up and lead nulling', 2, ANCHORS, [
          'Continuity assumed without measurement.',
          'Measured without nulling test leads.',
          'Continuity tester nulled and used correctly.',
          'Nulled, low-resistance leads used and result logged.'
        ]),
        rc('ELE-T4-r2', 'ELE-N0103', 'Correct test point and reading within limits', 2, ANCHORS, [
          'Wrong test point used.',
          'Correct point but reading not interpreted.',
          'Correct point; reading consistent with earthing requirement.',
          'Correct point, reading documented and benchmarked.'
        ], true),
        rc('ELE-T4-r3', 'ELE-N0103', 'Result recorded and safety restored', 1, ANCHORS, [
          'No record and accessory left open.',
          'Partial record; accessory not secured.',
          'Result recorded and accessory made safe.',
          'Recorded, access restored and reported to supervisor.'
        ])
      ]
    },
    {
      id: 'ELE-T5',
      nosId: 'ELE-N0104',
      title: 'Fault-find and rectify a tripping MCB',
      instruction:
        'A domestic circuit trips its MCB repeatedly. Diagnose the root cause, rectify it and restore the circuit. Demonstrate the process.',
      evidenceType: 'observation',
      rubric: [
        rc('ELE-T5-r1', 'ELE-N0104', 'Safe isolation and systematic fault-finding', 2, ANCHORS, [
          'Randomly replaced parts without isolation.',
          'Isolated but fault-finding unsystematic.',
          'Isolated and worked through the circuit methodically.',
          'Documented, methodical half-split fault-finding with isolation.'
        ], true),
        rc('ELE-T5-r2', 'ELE-N0104', 'Root cause identified (not just the symptom)', 2, ANCHORS, [
          'Cause not identified; fault recurs.',
          'Symptom treated; cause unclear.',
          'Root cause correctly identified.',
          'Root cause identified and contributing factors explained.'
        ], true),
        rc('ELE-T5-r3', 'ELE-N0104', 'Correct rectification to standard', 2, ANCHORS, [
          'Unsafe or non-compliant repair.',
          'Repair incomplete or to a lower standard.',
          'Correct, compliant rectification.',
          'Compliant repair with improved materials/route.'
        ]),
        rc('ELE-T5-r4', 'ELE-N0104', 'Functional re-test after repair', 2, ANCHORS, [
          'No re-test performed.',
          'Re-energised without verification.',
          'Circuit re-tested and operating correctly.',
          'Full re-test including IR and functional checks documented.'
        ], true)
      ]
    },
    {
      id: 'ELE-T6',
      nosId: 'ELE-N0101',
      title: 'Prepare and comply with safety before work',
      instruction:
        'Before starting any electrical task, demonstrate your safety preparation: PPE, isolation, hazard assessment and area control.',
      evidenceType: 'observation',
      rubric: [
        rc('ELE-T6-r1', 'ELE-N0101', 'Correct PPE selected, worn and in good condition', 2, ANCHORS, [
          'No PPE used.',
          'Some PPE but incorrect or damaged.',
          'Correct PPE worn and serviceable.',
          'Correct PPE plus pre-use inspection demonstrated.'
        ], true),
        rc('ELE-T6-r2', 'ELE-N0101', 'Isolation and lock-out/tag-out applied and verified', 2, ANCHORS, [
          'No isolation attempted.',
          'Isolated without lock-off or proof-of-dead.',
          'Isolated, locked off and proved dead.',
          'Isolation, lock-off, proof-of-dead and permit documented.'
        ], true),
        rc('ELE-T6-r3', 'ELE-N0101', 'Hazards identified and area secured', 2, ANCHORS, [
          'Hazards ignored.',
          'Some hazards noticed but not controlled.',
          'Hazards identified and area made safe.',
          'Risk assessed, controls applied and communicated to others.'
        ]),
        rc('ELE-T6-r4', 'ELE-N0101', 'Work area kept tidy and tools accounted for', 1, ANCHORS, [
          'Area left unsafe with tools scattered.',
          'Area partly tidy; tools not checked.',
          'Area tidy and tools accounted for.',
          '5S maintained and tools inspected before and after work.'
        ])
      ]
    }
  ]
};

/* =========================================================================
 * QP 2 - Assistant Electrician, NSQF Level 2
 * ======================================================================= */

const elecL2: QualificationPack = {
  id: 'ELE-Q0100',
  code: 'ELE/Q0100',
  title: 'Assistant Electrician',
  nsqfLevel: 2,
  sector: 'Electrical / Construction',
  indicativeHours: 250,
  description:
    'Assists a qualified electrician with wiring, tool handling and site safety under supervision.',
  tags: [
    'ppe', 'safety', 'housekeeping', 'hazard_id', 'stripping',
    'conduit', 'cable_selection', 'socket', 'switch', 'multimeter'
  ],
  nos: [
    {
      id: 'ELE-N0100',
      code: 'ELE/N0100',
      title: 'Assist with wiring and tool handling',
      description: 'Uses hand tools and assists with cable routing, preparation and site housekeeping.',
      criteria: [
        pc('pc-100-1', 'Identify and use basic electrical hand tools correctly', 2, { critical: true }),
        pc('pc-100-2', 'Assist with cable pulling, routing and securing', 2),
        pc('pc-100-3', 'Keep the work area safe, tidy and clear', 2),
        pc('pc-100-4', 'Follow supervisor instructions and report problems', 1)
      ]
    }
  ],
  tasks: [
    {
      id: 'ELE-T7',
      nosId: 'ELE-N0100',
      title: 'Route and secure conduit under supervision',
      instruction:
        'Route and secure PVC conduit between two boxes under supervision. Capture a photo of the completed run.',
      evidenceType: 'photo',
      rubric: [
        rc('ELE-T7-r1', 'ELE-N0100', 'Conduit cut and bent correctly', 2, ANCHORS, [
          'Conduit kinked or cut to wrong length.',
          'Conduit roughly correct with some deformation.',
          'Conduit cut and bent cleanly to the route.',
          'Conduit cut, bent and aligned neatly with no kinks.'
        ]),
        rc('ELE-T7-r2', 'ELE-N0100', 'Fixed with correct spacing and accessories', 2, ANCHORS, [
          'Not fixed or fixed with wrong accessories.',
          'Fixed with uneven spacing.',
          'Fixed securely at even spacing with correct accessories.',
          'Fixed securely, evenly spaced and inspection-friendly.'
        ], true),
        rc('ELE-T7-r3', 'ELE-N0100', 'Workspace kept safe and tidy', 1, ANCHORS, [
          'Area left unsafe.',
          'Area partly tidy.',
          'Area tidy and safe.',
          'Area tidy, waste cleared and tools accounted for.'
        ])
      ]
    },
    {
      id: 'ELE-T8',
      nosId: 'ELE-N0100',
      title: 'Prepare cable ends under supervision',
      instruction: 'Prepare and strip cable ends for termination under supervision. Demonstrate the tools used.',
      evidenceType: 'observation',
      rubric: [
        rc('ELE-T8-r1', 'ELE-N0100', 'Correct tool selected and used safely', 2, ANCHORS, [
          'Improvised tool; unsafe use.',
          'Correct tool but unsafe technique.',
          'Correct tool used safely.',
          'Correct tool, safe technique and tool maintained.'
        ], true),
        rc('ELE-T8-r2', 'ELE-N0100', 'Insulation stripped without conductor damage', 2, ANCHORS, [
          'Conductors nicked or cut.',
          'Minor strand damage.',
          'Insulation removed cleanly, conductors intact.',
          'Clean strip, correct length, conductors undamaged.'
        ], true)
      ]
    }
  ]
};

/* =========================================================================
 * QP 3 - Solar PV Installer (Electrical), NSQF Level 4
 * ======================================================================= */

const solarL4: QualificationPack = {
  id: 'SOL-Q0201',
  code: 'SOL/Q0201',
  title: 'Solar PV Installer (Electrical)',
  nsqfLevel: 4,
  sector: 'Renewable Energy',
  indicativeHours: 500,
  description:
    'Installs, connects, commissions and maintains rooftop solar photovoltaic systems and their electrical interfaces.',
  tags: [
    'ppe', 'loto', 'safety', 'solar_pv', 'mounting', 'dc_wiring',
    'inverter', 'earthing', 'multimeter', 'insulation_test', 'commissioning',
    'cable_selection'
  ],
  nos: [
    {
      id: 'SOL-N0201',
      code: 'SOL/N0201',
      title: 'Install solar PV modules and DC wiring',
      description: 'Inspects structures, mounts modules and connects DC strings with correct polarity.',
      criteria: [
        pc('pc-201-1', 'Inspect and prepare the mounting structure', 2),
        pc('pc-201-2', 'Mount and orient modules to the design', 2, { critical: true }),
        pc('pc-201-3', 'Connect DC strings with correct polarity', 2, { critical: true }),
        pc('pc-201-4', 'Label and test strings before connection', 1)
      ]
    },
    {
      id: 'SOL-N0202',
      code: 'SOL/N0202',
      title: 'Install and connect inverter and protection',
      description: 'Mounts the inverter, terminates AC/DC connections and commissions the system.',
      criteria: [
        pc('pc-202-1', 'Mount the inverter with correct clearances', 1),
        pc('pc-202-2', 'Terminate AC and DC connections to specification', 2, { critical: true }),
        pc('pc-202-3', 'Connect earthing and surge protection', 2, { critical: true }),
        pc('pc-202-4', 'Commission and verify system output', 2, { critical: true })
      ]
    }
  ],
  tasks: [
    {
      id: 'SOL-T1',
      nosId: 'SOL-N0201',
      title: 'Mount and wire a PV string with correct polarity',
      instruction:
        'Mount two modules, interconnect them and label the string. Record a video showing polarity check and string voltage measurement.',
      evidenceType: 'video',
      rubric: [
        rc('SOL-T1-r1', 'SOL-N0201', 'Modules mounted and oriented to design', 2, ANCHORS, [
          'Modules loose or wrongly oriented.',
          'Modules mounted but misaligned.',
          'Modules mounted securely and oriented to design.',
          'Secure, aligned mounting with correct tilt and clamping.'
        ], true),
        rc('SOL-T1-r2', 'SOL-N0201', 'DC string polarity correct and verified', 2, ANCHORS, [
          'Polarity reversed; not checked.',
          'Polarity assumed without measurement.',
          'Polarity measured and correct before connection.',
          'Polarity and string voltage measured and documented.'
        ], true),
        rc('SOL-T1-r3', 'SOL-N0201', 'Connectors mated correctly and cable managed', 1, ANCHORS, [
          'Connectors forced or overheated.',
          'Connectors mated but cable poorly managed.',
          'Connectors correctly mated; UV-rated cable secured.',
          'Correct mating, cable management and strain relief.'
        ])
      ]
    },
    {
      id: 'SOL-T2',
      nosId: 'SOL-N0202',
      title: 'Commission an inverter and verify output',
      instruction:
        'Mount and connect the inverter, then commission it and verify AC output and protective earthing.',
      evidenceType: 'measurement',
      rubric: [
        rc('SOL-T2-r1', 'SOL-N0202', 'AC/DC terminations to specification', 2, ANCHORS, [
          'Terminations loose or reversed.',
          'Terminations secure but insulation/clearance wrong.',
          'Terminations to specification with correct cable sizing.',
          'Correct terminations, torque-checked and labelled.'
        ], true),
        rc('SOL-T2-r2', 'SOL-N0202', 'Earthing and surge protection connected and verified', 2, ANCHORS, [
          'Earth omitted.',
          'Earth connected but not verified.',
          'Earth and SPD connected and verified.',
          'Verified earth with continuity result and SPD status logged.'
        ], true),
        rc('SOL-T2-r3', 'SOL-N0202', 'System commissioned and output verified', 2, ANCHORS, [
          'Not commissioned.',
          'Energised without verification.',
          'Output measured and within expected range.',
          'Output, voltage, current and alerts verified and documented.'
        ], true)
      ]
    }
  ]
};

/* =========================================================================
 * QP 4 - Electrical Panel / Control Panel Technician, NSQF Level 4
 * ======================================================================= */

const panelL4: QualificationPack = {
  id: 'ELE-Q0301',
  code: 'ELE/Q0301',
  title: 'Electrical Panel (Control Panel) Technician',
  nsqfLevel: 4,
  sector: 'Electrical / Manufacturing',
  indicativeHours: 550,
  description:
    'Reads wiring diagrams and assembles, wires, tests and maintains control panels and motor starter circuits.',
  tags: [
    'ppe', 'loto', 'safety', 'panel_wiring', 'control_panel', 'contactor',
    'three_phase', 'distribution_board', 'fault_diagnosis', 'rectification',
    'retest', 'multimeter', 'insulation_test'
  ],
  nos: [
    {
      id: 'ELE-N0301',
      code: 'ELE/N0301',
      title: 'Assemble and wire control panels',
      description: 'Interprets diagrams and assembles and wires control panels to specification.',
      criteria: [
        pc('pc-301-1', 'Interpret the wiring/schematic diagram', 2, { critical: true }),
        pc('pc-301-2', 'Layout components to the drawing', 2),
        pc('pc-301-3', 'Control wiring terminated to specification', 2, { critical: true }),
        pc('pc-301-4', 'Label wiring and terminals', 1),
        pc('pc-301-5', 'Functionally test the panel', 2, { critical: true })
      ]
    },
    {
      id: 'ELE-N0302',
      code: 'ELE/N0302',
      title: 'Maintain three-phase motor starter circuits',
      description: 'Isolates, tests, diagnoses and repairs three-phase motor starter circuits.',
      criteria: [
        pc('pc-302-1', 'Isolate three-phase supply safely', 2, { critical: true }),
        pc('pc-302-2', 'Test contactor and overload relay', 2),
        pc('pc-302-3', 'Identify phase loss / imbalance faults', 2),
        pc('pc-302-4', 'Replace components and re-test', 2, { critical: true })
      ]
    }
  ],
  tasks: [
    {
      id: 'ELE-T9',
      nosId: 'ELE-N0301',
      title: 'Assemble and wire a DOL starter panel',
      instruction:
        'Assemble and wire a direct-on-line (DOL) motor starter panel from a wiring diagram. Capture a photo of the completed, labelled panel.',
      evidenceType: 'photo',
      rubric: [
        rc('ELE-T9-r1', 'ELE-N0301', 'Correct interpretation of the wiring diagram', 2, ANCHORS, [
          'Diagram not followed.',
          'Broad layout followed with errors.',
          'Diagram followed correctly throughout.',
          'Diagram followed and layout optimised for maintenance.'
        ], true),
        rc('ELE-T9-r2', 'ELE-N0301', 'Components mounted to layout', 2, ANCHORS, [
          'Components loose or mis-mounted.',
          'Components mounted with spacing issues.',
          'Components mounted to layout with correct clearances.',
          'Mounted to layout with cable ducts and access considered.'
        ]),
        rc('ELE-T9-r3', 'ELE-N0301', 'Control wiring terminated and labelled', 2, ANCHORS, [
          'Wiring incorrect; circuit non-functional.',
          'Wiring mostly correct; some terminations loose.',
          'Control wiring correct, terminated and labelled.',
          'Correct wiring, ferrule/label applied and routing tidy.'
        ], true),
        rc('ELE-T9-r4', 'ELE-N0301', 'Panel functionally tested', 2, ANCHORS, [
          'Not tested.',
          'Energised without functional test.',
          'Start/stop and overload functions tested.',
          'All functions tested and results documented.'
        ], true)
      ]
    },
    {
      id: 'ELE-T10',
      nosId: 'ELE-N0302',
      title: 'Fault-find a three-phase starter circuit',
      instruction:
        'A three-phase starter fails to start the motor. Isolate safely, diagnose, repair and re-test.',
      evidenceType: 'observation',
      rubric: [
        rc('ELE-T10-r1', 'ELE-N0302', 'Safe three-phase isolation applied', 2, ANCHORS, [
          'Worked live on three-phase.',
          'Isolated but not locked off/proved dead.',
          'Isolated, locked off and proved dead on all phases.',
          'Documented isolation and verification on all phases.'
        ], true),
        rc('ELE-T10-r2', 'ELE-N0302', 'Components tested (contactor, overload)', 2, ANCHORS, [
          'Components not tested.',
          'Superficial check only.',
          'Contactor and overload tested with results.',
          'Components tested and phase balance measured.'
        ]),
        rc('ELE-T10-r3', 'ELE-N0302', 'Root cause identified and repaired', 2, ANCHORS, [
          'Fault not found.',
          'Parts swapped without diagnosis.',
          'Root cause found and correctly repaired.',
          'Root cause found, repaired and preventive advice given.'
        ], true),
        rc('ELE-T10-r4', 'ELE-N0302', 'Re-test and functional verification', 2, ANCHORS, [
          'Not re-tested.',
          'Restarted without verification.',
          'Motor starts and runs under test.',
          'Full run, current and overload trip test documented.'
        ], true)
      ]
    }
  ]
};

export const QUALIFICATION_PACKS: QualificationPack[] = [elecL3, elecL2, solarL4, panelL4];

export function getQP(id: string | undefined): QualificationPack | undefined {
  if (!id) return undefined;
  return QUALIFICATION_PACKS.find((q) => q.id === id);
}

export function getTask(qp: QualificationPack, taskId: string) {
  return qp.tasks.find((t) => t.id === taskId);
}

/** All scored rubric criteria for a QP, grouped by NOS id. */
export function rubricCriteriaByNOS(qp: QualificationPack): Record<string, RubricCriterion[]> {
  const out: Record<string, RubricCriterion[]> = {};
  for (const t of qp.tasks) {
    for (const c of t.rubric) {
      (out[c.nosId] ||= []).push(c);
    }
  }
  return out;
}

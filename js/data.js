/* ============================================================
   ForensiTriage — Data Layer
   localStorage CRUD · Demo Data Seeder
   ============================================================ */

const KEYS = {
  USERS:    'ft_users',
  CASES:    'ft_cases',
  EVIDENCE: 'ft_evidence',
  SEEDED:   'ft_seeded_v3',
};

window.CRIME_TYPES = [
  'Murder', 'Theft', 'Assault', 'Robbery',
  'Cybercrime', 'Sexual Offence', 'Missing Person', 'Other',
];

window.EVIDENCE_CATEGORIES = [
  'Biological', 'Digital', 'Fingerprint/Impression',
  'Trace', 'Physical', 'Document', 'Other',
];

window.CASE_STATUSES   = ['Active', 'Pending', 'Under Review', 'Closed'];
window.PRIORITY_LEVELS = ['Critical', 'High', 'Medium', 'Low', 'Unassigned'];

/* ── Generic helpers ────────────────────────────────────────── */
function dbGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function dbSet(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ── Users ──────────────────────────────────────────────────── */
window.UsersDB = {
  all()     { return dbGet(KEYS.USERS); },
  find(id)  { return this.all().find(u => u.id === id) || null; },
  findByEmail(email) {
    return this.all().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  save(user) {
    const users = this.all();
    const idx   = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
    dbSet(KEYS.USERS, users);
    return user;
  },
  create(data) {
    const user = {
      id:        genId('usr'),
      name:      data.name,
      email:     data.email,
      password:  data.password,
      role:      data.role || 'user',
      createdAt: DateUtils.isoNow(),
    };
    this.save(user);
    return user;
  },
};

/* ── Cases ──────────────────────────────────────────────────── */
window.CasesDB = {
  all()    { return dbGet(KEYS.CASES); },
  find(id) { return this.all().find(c => c.id === id) || null; },

  create(data) {
    const c = {
      id:          genId('case'),
      caseNumber:  data.caseNumber || ('FT-' + Date.now().toString().slice(-6)),
      title:       data.title,
      description: data.description || '',
      crimeType:   data.crimeType,
      crimeTypeCustom: data.crimeTypeCustom || '',
      status:      data.status || 'Active',
      location:    data.location || '',
      dateOfIncident: data.dateOfIncident || '',
      leadInvestigator: data.leadInvestigator || '',
      createdBy:   data.createdBy,
      createdAt:   DateUtils.isoNow(),
      updatedAt:   DateUtils.isoNow(),
    };
    const cases = this.all();
    cases.push(c);
    dbSet(KEYS.CASES, cases);
    ActivityLog.add('Case Created', `Case "${c.title}" (${c.caseNumber})`, { caseId: c.id });
    return c;
  },

  update(id, data) {
    const cases = this.all();
    const idx   = cases.findIndex(c => c.id === id);
    if (idx < 0) return null;
    const updated = { ...cases[idx], ...data, id, updatedAt: DateUtils.isoNow() };
    cases[idx] = updated;
    dbSet(KEYS.CASES, cases);
    ActivityLog.add('Case Updated', `Case "${updated.title}" (${updated.caseNumber})`, { caseId: id });
    return updated;
  },

  delete(id) {
    const c = this.find(id);
    const cases = this.all().filter(x => x.id !== id);
    dbSet(KEYS.CASES, cases);
    // Also delete associated evidence
    const evidence = EvidenceDB.all().filter(e => e.caseId !== id);
    dbSet(KEYS.EVIDENCE, evidence);
    if (c) ActivityLog.add('Case Deleted', `Case "${c.title}" (${c.caseNumber})`, { caseId: id });
    return true;
  },
};

/* ── Evidence ───────────────────────────────────────────────── */
window.EvidenceDB = {
  all()         { return dbGet(KEYS.EVIDENCE); },
  find(id)      { return this.all().find(e => e.id === id) || null; },
  forCase(caseId) { return this.all().filter(e => e.caseId === caseId); },

  create(data) {
    const e = {
      id:           genId('ev'),
      caseId:       data.caseId,
      evidenceNumber: data.evidenceNumber || ('EV-' + Date.now().toString().slice(-5)),
      name:         data.name,
      description:  data.description || '',
      category:     data.category,
      categoryCustom: data.categoryCustom || '',
      collectedBy:  data.collectedBy || '',
      collectedAt:  data.collectedAt || '',
      location:     data.location || '',
      notes:        data.notes || '',
      priority:     data.priority || 'Unassigned',
      priorityHistory: [],
      attachments:  [],
      createdBy:    data.createdBy,
      createdAt:    DateUtils.isoNow(),
      updatedAt:    DateUtils.isoNow(),
      lastViewedAt: null,
    };
    const all = this.all();
    all.push(e);
    dbSet(KEYS.EVIDENCE, all);
    ActivityLog.add('Evidence Added', `"${e.name}" (${e.evidenceNumber})`, { evidenceId: e.id, caseId: e.caseId });
    return e;
  },

  update(id, data) {
    const all = this.all();
    const idx = all.findIndex(e => e.id === id);
    if (idx < 0) return null;
    const updated = { ...all[idx], ...data, id, updatedAt: DateUtils.isoNow() };
    all[idx] = updated;
    dbSet(KEYS.EVIDENCE, all);
    ActivityLog.add('Evidence Updated', `"${updated.name}" (${updated.evidenceNumber})`, { evidenceId: id });
    return updated;
  },

  setPriority(id, newPriority, reason, investigatorName) {
    const all = this.all();
    const idx = all.findIndex(e => e.id === id);
    if (idx < 0) return null;
    const prev = all[idx].priority || 'Unassigned';
    const historyEntry = {
      from:        prev,
      to:          newPriority,
      reason:      reason || '',
      changedBy:   investigatorName || 'Unknown',
      changedAt:   DateUtils.isoNow(),
    };
    all[idx].priority = newPriority;
    all[idx].priorityHistory = [historyEntry, ...(all[idx].priorityHistory || [])];
    all[idx].updatedAt = DateUtils.isoNow();
    dbSet(KEYS.EVIDENCE, all);
    ActivityLog.add(
      'Priority Changed',
      `"${all[idx].name}" priority changed ${prev} → ${newPriority}`,
      { evidenceId: id, from: prev, to: newPriority, reason }
    );
    return all[idx];
  },

  addAttachment(id, attachment) {
    const all = this.all();
    const idx = all.findIndex(e => e.id === id);
    if (idx < 0) return null;
    all[idx].attachments = all[idx].attachments || [];
    all[idx].attachments.push(attachment);
    all[idx].updatedAt = DateUtils.isoNow();
    dbSet(KEYS.EVIDENCE, all);
    ActivityLog.add('Attachment Added', `File "${attachment.name}" on "${all[idx].name}"`, { evidenceId: id });
    return all[idx];
  },

  removeAttachment(evidenceId, attachmentId) {
    const all = this.all();
    const idx = all.findIndex(e => e.id === evidenceId);
    if (idx < 0) return null;
    const att = (all[idx].attachments || []).find(a => a.id === attachmentId);
    all[idx].attachments = (all[idx].attachments || []).filter(a => a.id !== attachmentId);
    all[idx].updatedAt = DateUtils.isoNow();
    dbSet(KEYS.EVIDENCE, all);
    if (att) ActivityLog.add('Attachment Removed', `File "${att.name}" from "${all[idx].name}"`, { evidenceId });
    return all[idx];
  },

  markViewed(id) {
    const all = this.all();
    const idx = all.findIndex(e => e.id === id);
    if (idx < 0) return;
    all[idx].lastViewedAt = DateUtils.isoNow();
    dbSet(KEYS.EVIDENCE, all);
  },

  delete(id) {
    const e = this.find(id);
    const all = this.all().filter(x => x.id !== id);
    dbSet(KEYS.EVIDENCE, all);
    if (e) ActivityLog.add('Evidence Deleted', `"${e.name}" (${e.evidenceNumber})`, { evidenceId: id, caseId: e.caseId });
    return true;
  },
};

/* ── Demo Data Seeder ───────────────────────────────────────── */
window.seedDemoData = function () {
  if (localStorage.getItem(KEYS.SEEDED)) return;

  // Demo accounts
  UsersDB.save({
    id: 'usr_demo_user',
    name: 'Alex Morgan',
    email: 'user@forensitriage.demo',
    password: 'User@123',
    role: 'user',
    createdAt: '2024-08-01T08:00:00.000Z',
  });
  UsersDB.save({
    id: 'usr_demo_inv',
    name: 'Dr. Sarah Holloway',
    email: 'investigator@forensitriage.demo',
    password: 'Investigator@123',
    role: 'investigator',
    createdAt: '2024-07-15T09:00:00.000Z',
  });

  // Seed cases directly to avoid activity log noise during seeding
  const cases = [
    {
      id: 'case_demo_001',
      caseNumber: 'FT-240801',
      title: 'Northgate Homicide Investigation',
      description: 'Suspicious death of a 42-year-old male found at 14 Northgate Avenue. Multiple items of physical and biological evidence collected from the primary scene and adjacent alleyway.',
      crimeType: 'Murder',
      crimeTypeCustom: '',
      status: 'Active',
      location: 'Northgate Avenue, District 4',
      dateOfIncident: '2024-07-28',
      leadInvestigator: 'Dr. Sarah Holloway',
      createdBy: 'usr_demo_inv',
      createdAt: '2024-07-29T07:30:00.000Z',
      updatedAt: '2024-08-10T14:20:00.000Z',
    },
    {
      id: 'case_demo_002',
      caseNumber: 'FT-240802',
      title: 'Riverside Warehouse Burglary',
      description: 'Commercial burglary reported at Riverside Warehouse Unit 7. Security footage corrupted. Entry via forced rear door. Significant inventory loss.',
      crimeType: 'Theft',
      crimeTypeCustom: '',
      status: 'Under Review',
      location: 'Riverside Industrial Estate, Unit 7',
      dateOfIncident: '2024-08-03',
      leadInvestigator: 'Dr. Sarah Holloway',
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-04T09:15:00.000Z',
      updatedAt: '2024-08-12T11:00:00.000Z',
    },
    {
      id: 'case_demo_003',
      caseNumber: 'FT-240803',
      title: 'Central Bank Cyber Intrusion',
      description: 'Unauthorised access to the Central District Bank network. Suspicious data exfiltration detected. Digital forensics required on compromised servers.',
      crimeType: 'Cybercrime',
      crimeTypeCustom: '',
      status: 'Active',
      location: 'Central District Bank, HQ',
      dateOfIncident: '2024-08-05',
      leadInvestigator: 'Dr. Sarah Holloway',
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-06T10:00:00.000Z',
      updatedAt: '2024-08-11T16:45:00.000Z',
    },
    {
      id: 'case_demo_004',
      caseNumber: 'FT-240804',
      title: 'Meadowbrook Missing Person',
      description: 'Missing person report for 17-year-old female last seen near Meadowbrook Park. Personal belongings recovered at scene. Family notified.',
      crimeType: 'Missing Person',
      crimeTypeCustom: '',
      status: 'Active',
      location: 'Meadowbrook Park, East Side',
      dateOfIncident: '2024-08-09',
      leadInvestigator: 'Dr. Sarah Holloway',
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-09T19:00:00.000Z',
      updatedAt: '2024-08-13T08:30:00.000Z',
    },
  ];
  dbSet(KEYS.CASES, cases);

  const evidence = [
    // Case 001 — Northgate Homicide
    {
      id: 'ev_demo_001',
      caseId: 'case_demo_001',
      evidenceNumber: 'EV-24001',
      name: 'Blood Sample — Primary Scene',
      description: 'Pooled blood sample collected from kitchen floor, approx. 0.3m diameter. High probability of belonging to the victim.',
      category: 'Biological',
      categoryCustom: '',
      collectedBy: 'CSI Team A',
      collectedAt: '2024-07-28',
      location: 'Kitchen Floor, 14 Northgate Avenue',
      notes: 'Requires DNA typing. Chain of custody maintained.',
      priority: 'Critical',
      priorityHistory: [
        { from: 'Unassigned', to: 'Critical', reason: 'Primary biological evidence at scene. Requires urgent DNA analysis.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-07-29T08:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-07-29T08:30:00.000Z',
      updatedAt: '2024-07-29T08:30:00.000Z',
      lastViewedAt: '2024-08-10T14:20:00.000Z',
    },
    {
      id: 'ev_demo_002',
      caseId: 'case_demo_001',
      evidenceNumber: 'EV-24002',
      name: 'Partial Fingerprint — Window Frame',
      description: 'Partial latent fingerprint lifted from interior window frame in the hallway. Approximately 60% of the pattern visible.',
      category: 'Fingerprint/Impression',
      categoryCustom: '',
      collectedBy: 'CSI Team A',
      collectedAt: '2024-07-28',
      location: 'Hallway Window, 14 Northgate Avenue',
      notes: 'Suitable for AFIS comparison. Photographed and lifted.',
      priority: 'High',
      priorityHistory: [
        { from: 'Unassigned', to: 'High', reason: 'Potential suspect fingerprint. AFIS comparison required.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-07-29T08:15:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-07-29T09:00:00.000Z',
      updatedAt: '2024-07-29T09:00:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_003',
      caseId: 'case_demo_001',
      evidenceNumber: 'EV-24003',
      name: 'Kitchen Knife — Possible Weapon',
      description: 'Serrated kitchen knife (25cm blade) recovered near the victim. Possible bloodstains on the blade and handle.',
      category: 'Physical',
      categoryCustom: '',
      collectedBy: 'CSI Team A',
      collectedAt: '2024-07-28',
      location: 'Near victim, kitchen floor',
      notes: 'Bagged and tagged. Requires blood typing and DNA analysis. Also fingerprint examination.',
      priority: 'Critical',
      priorityHistory: [
        { from: 'Unassigned', to: 'Critical', reason: 'Likely murder weapon. Multiple forensic analyses required.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-07-29T08:20:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-07-29T09:30:00.000Z',
      updatedAt: '2024-07-29T09:30:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_004',
      caseId: 'case_demo_001',
      evidenceNumber: 'EV-24004',
      name: 'Trace Fibres — Doorway',
      description: 'Dark synthetic fibres collected from the door frame of the back entrance. Consistent with a dark jacket.',
      category: 'Trace',
      categoryCustom: '',
      collectedBy: 'CSI Team A',
      collectedAt: '2024-07-28',
      location: 'Back door frame',
      notes: 'Requires microscopic and spectroscopic analysis.',
      priority: 'Medium',
      priorityHistory: [
        { from: 'Unassigned', to: 'Medium', reason: 'Potential suspect trace. Secondary priority behind biological and fingerprint.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-07-30T09:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-07-30T09:30:00.000Z',
      updatedAt: '2024-07-30T09:30:00.000Z',
      lastViewedAt: null,
    },
    // Case 002 — Warehouse Burglary
    {
      id: 'ev_demo_005',
      caseId: 'case_demo_002',
      evidenceNumber: 'EV-24005',
      name: 'Forced Entry Toolmarks — Rear Door',
      description: 'Toolmark impressions on the rear steel door frame consistent with a crowbar or similar lever tool.',
      category: 'Fingerprint/Impression',
      categoryCustom: '',
      collectedBy: 'CSI Team B',
      collectedAt: '2024-08-04',
      location: 'Rear door, Warehouse Unit 7',
      notes: 'Castings made. Comparison with tool database required.',
      priority: 'High',
      priorityHistory: [
        { from: 'Unassigned', to: 'High', reason: 'Primary entry method evidence.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-04T11:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-04T11:30:00.000Z',
      updatedAt: '2024-08-04T11:30:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_006',
      caseId: 'case_demo_002',
      evidenceNumber: 'EV-24006',
      name: 'CCTV Hard Drive',
      description: 'Hard drive recovered from security DVR unit. Footage appears corrupted or deliberately wiped. Requires digital forensic recovery.',
      category: 'Digital',
      categoryCustom: '',
      collectedBy: 'CSI Team B',
      collectedAt: '2024-08-04',
      location: 'Security room, Warehouse Unit 7',
      notes: 'Sector-level imaging required. Potential partial recovery possible.',
      priority: 'High',
      priorityHistory: [
        { from: 'Unassigned', to: 'High', reason: 'CCTV footage may identify suspects if recovered.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-05T09:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-05T09:30:00.000Z',
      updatedAt: '2024-08-05T09:30:00.000Z',
      lastViewedAt: null,
    },
    // Case 003 — Cybercrime
    {
      id: 'ev_demo_007',
      caseId: 'case_demo_003',
      evidenceNumber: 'EV-24007',
      name: 'Compromised Server — Primary',
      description: 'Bank primary transaction server suspected to be the initial point of compromise. System logs preserved for analysis.',
      category: 'Digital',
      categoryCustom: '',
      collectedBy: 'IT Security Team',
      collectedAt: '2024-08-06',
      location: 'Server Room B, Central District Bank HQ',
      notes: 'Forensic image created. Original server isolated.',
      priority: 'Critical',
      priorityHistory: [
        { from: 'Unassigned', to: 'Critical', reason: 'Primary vector of intrusion. Urgent analysis needed.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-06T11:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-06T11:30:00.000Z',
      updatedAt: '2024-08-06T11:30:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_008',
      caseId: 'case_demo_003',
      evidenceNumber: 'EV-24008',
      name: 'Network Access Logs',
      description: 'Exported network access logs from firewall system. Logs span 72 hours prior to detection. Anomalous access patterns noted.',
      category: 'Document',
      categoryCustom: '',
      collectedBy: 'IT Security Team',
      collectedAt: '2024-08-06',
      location: 'Digital — exported from firewall controller',
      notes: 'Log file hash verified. 4.2GB compressed archive.',
      priority: 'High',
      priorityHistory: [
        { from: 'Unassigned', to: 'High', reason: 'Contains timestamps and IP addresses for intrusion path reconstruction.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-07T09:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-07T09:30:00.000Z',
      updatedAt: '2024-08-07T09:30:00.000Z',
      lastViewedAt: null,
    },
    // Case 004 — Missing Person
    {
      id: 'ev_demo_009',
      caseId: 'case_demo_004',
      evidenceNumber: 'EV-24009',
      name: "Victim's Mobile Phone",
      description: 'Samsung smartphone recovered near the park bench. Screen cracked. Last known location data potentially recoverable.',
      category: 'Digital',
      categoryCustom: '',
      collectedBy: 'Patrol Officer Williams',
      collectedAt: '2024-08-09',
      location: 'Bench 3, Meadowbrook Park',
      notes: 'Requires passcode bypass or forensic extraction. Battery dead on recovery — preserved.',
      priority: 'Critical',
      priorityHistory: [
        { from: 'Unassigned', to: 'Critical', reason: 'Last known location data and contacts critical for trace.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-09T20:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-09T20:30:00.000Z',
      updatedAt: '2024-08-09T20:30:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_010',
      caseId: 'case_demo_004',
      evidenceNumber: 'EV-24010',
      name: "Abandoned Backpack",
      description: "Victim's school backpack found discarded near park exit. Contains textbooks and personal items. No signs of forced removal.",
      category: 'Physical',
      categoryCustom: '',
      collectedBy: 'Patrol Officer Williams',
      collectedAt: '2024-08-09',
      location: 'Park exit, east gate, Meadowbrook Park',
      notes: 'Contents photographed and inventoried. Fingerprint examination of bag exterior pending.',
      priority: 'Medium',
      priorityHistory: [
        { from: 'Unassigned', to: 'Medium', reason: 'May contain fingerprints of suspects. Secondary to mobile phone analysis.', changedBy: 'Dr. Sarah Holloway', changedAt: '2024-08-10T08:00:00.000Z' }
      ],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-10T08:30:00.000Z',
      updatedAt: '2024-08-10T08:30:00.000Z',
      lastViewedAt: null,
    },
    {
      id: 'ev_demo_011',
      caseId: 'case_demo_004',
      evidenceNumber: 'EV-24011',
      name: 'Witness Statement — John Adeyemi',
      description: 'Written statement from park groundskeeper. Reports seeing an unfamiliar vehicle near the park between 17:00–18:30 on the day of disappearance.',
      category: 'Document',
      categoryCustom: '',
      collectedBy: 'DC Patel',
      collectedAt: '2024-08-10',
      location: 'Meadowbrook Park Maintenance Office',
      notes: 'Vehicle described as dark-coloured estate car, partial plate noted.',
      priority: 'Low',
      priorityHistory: [],
      attachments: [],
      createdBy: 'usr_demo_inv',
      createdAt: '2024-08-10T09:00:00.000Z',
      updatedAt: '2024-08-10T09:00:00.000Z',
      lastViewedAt: null,
    },
  ];
  dbSet(KEYS.EVIDENCE, evidence);

  // Seed activity log
  const activities = [
    { id: 'act_seed_1', action: 'Case Created',     detail: 'Case "Northgate Homicide Investigation" (FT-240801)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-07-29T07:30:00.000Z', meta: { caseId: 'case_demo_001' } },
    { id: 'act_seed_2', action: 'Evidence Added',   detail: '"Blood Sample — Primary Scene" (EV-24001)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-07-29T08:30:00.000Z', meta: { evidenceId: 'ev_demo_001' } },
    { id: 'act_seed_3', action: 'Priority Changed', detail: '"Blood Sample" priority changed Unassigned → Critical', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-07-29T08:00:00.000Z', meta: { from: 'Unassigned', to: 'Critical' } },
    { id: 'act_seed_4', action: 'Case Created',     detail: 'Case "Riverside Warehouse Burglary" (FT-240802)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-08-04T09:15:00.000Z', meta: { caseId: 'case_demo_002' } },
    { id: 'act_seed_5', action: 'Case Created',     detail: 'Case "Central Bank Cyber Intrusion" (FT-240803)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-08-06T10:00:00.000Z', meta: { caseId: 'case_demo_003' } },
    { id: 'act_seed_6', action: 'Case Created',     detail: 'Case "Meadowbrook Missing Person" (FT-240804)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-08-09T19:00:00.000Z', meta: { caseId: 'case_demo_004' } },
    { id: 'act_seed_7', action: 'Evidence Added',   detail: '"Victim\'s Mobile Phone" (EV-24009)', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-08-09T20:30:00.000Z', meta: { evidenceId: 'ev_demo_009' } },
    { id: 'act_seed_8', action: 'Priority Changed', detail: '"Victim\'s Mobile Phone" priority changed Unassigned → Critical', user: 'Dr. Sarah Holloway', userId: 'usr_demo_inv', timestamp: '2024-08-09T20:00:00.000Z', meta: { from: 'Unassigned', to: 'Critical' } },
  ];
  localStorage.setItem(ActivityLog.KEY, JSON.stringify(activities));

  localStorage.setItem(KEYS.SEEDED, '1');
};

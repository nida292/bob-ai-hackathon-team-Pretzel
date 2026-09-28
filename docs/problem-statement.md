# Problem Statement

## Background

Digital forensic science and crime scene investigation generates vast quantities of physical, biological, digital, and trace evidence at complex crime scenes. A single homicide scene may yield dozens of distinct evidence items — blood samples, DNA swabs, digital devices, latent fingerprints, trace fibres, documents and more. Each category of evidence has different stability characteristics, examination requirements, and forensic probative value.

## The Problem

Forensic investigators and scene-of-crime officers (SOCOs) must manually decide the examination order for evidence items, typically without decision-support tooling. This is a high-stakes prioritization problem:

- **Biological evidence** (blood, tissue, DNA) begins to degrade within hours to days if improperly stored or delayed.
- **Digital evidence** (mobile phones, storage media) may be remotely wiped or encrypted if not promptly imaged.
- **Contaminated items** may cross-contaminate other evidence if not isolated and examined urgently.
- A backlogged forensic laboratory may not process lower-priority items for weeks, meaning that the *order* in which items are submitted directly affects case outcomes.

Without a systematic, transparent method for determining examination order, investigators rely entirely on personal experience and informal rules, leading to inconsistent decisions, missed urgency signals, and sometimes the loss of time-critical evidence.

## Who is Affected

- **Forensic investigators and SOCOs** at national and state forensic science laboratories who must triage evidence submissions.
- **Case officers and detectives** who need to understand the reasoning behind examination priorities.
- **Forensic laboratory managers** who allocate examination workload across staff and instruments.
- Particularly relevant in under-resourced laboratories where manual triage is the only available option.

## Why It Matters

Evidence degradation and delayed examination can directly affect criminal investigations:
- Biological samples lost to degradation cannot be re-collected.
- Delayed digital forensics can result in evidence destruction (remote wipe, encryption, hardware failure).
- Incorrectly ordered examinations can increase cross-contamination risk.
- Inconsistent prioritization decisions may be challenged during prosecution, weakening cases.

## Why Existing Solutions Fall Short

Current practice relies on experienced forensic officers applying informal, undocumented rules. There is no standardised decision-support tool that:
- Scores evidence items systematically on multiple risk factors
- Provides an auditable, explainable rationale for each priority recommendation
- Allows investigators to override recommendations with a documented reason
- Produces a case-level report linking priorities to examination recommendations

ForensiTriage addresses this gap with a transparent, rule-based prototype that makes the prioritization logic explicit and auditable.

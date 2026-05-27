# Retirement Visa Self-Filing Design

**Goal:** Add a VisaFiler AI module that helps qualified Thailand retirees understand whether they can self-file, which route applies, which forms are needed, and what to bring to immigration.

**Date:** 2026-05-27

**Status:** Planned

## Product Positioning

This module is the "agent-fee saver" workflow for people who qualify for a Thailand retirement route and want to avoid a typical agent package. It should compare a realistic agent-assisted cost of 40,000 to 60,000 THB against the official self-filing route, while avoiding any promise of approval.

Public-facing message:

> Retirement visa self-filing assistant: avoid agent fees if you qualify.

The app prepares paperwork and checklists. It does not provide immigration or legal advice, does not guarantee approval, and does not help bypass financial requirements.

## Source Anchors

Use these as the initial rule anchors. Re-check before launch because immigration rules and local office practices can change.

- Thailand.go retirement conversion guide: https://thailand.go.th/issue-focus-detail/001-01-044?hl=en
- Thailand.go retirement stay extension guide: https://thailand.go.th/public/issue-focus-detail/001_01_134
- Immigration Bureau re-entry permit handbook: https://www.immigration.go.th/citizen_manual/guid_en5.pdf

Key source facts:

- In-country retirement conversion is for applicants age 50 or older seeking Non-Immigrant O status.
- Tourist or transit visa holders use TM.86 for conversion.
- Visa-exempt entrants use TM.87 to obtain a visa.
- Conversion requires more than 15 days remaining and no overstay.
- Conversion application fee is 2,000 THB.
- Retirement stay extension requires Non-Immigrant status, age 50 or older, and financial proof.
- Retirement financial routes include 65,000 THB monthly income, 800,000 THB in a Thai bank account, or a qualifying combined method.
- Retirement extension uses TM.7.
- Re-entry permit uses TM.8 and is a separate add-on after a stay permit exists.

## User Types

### Clean DIY Applicant

The primary target. This person is 50 or older, can satisfy the financial requirements, can attend immigration in person, and wants help preparing forms and documents without paying a full agent package.

### Not Ready Yet Applicant

This person may qualify later, but has blockers such as too few days remaining, no Thai bank account, no financial evidence, or no TM.30/address proof.

### Agent Fallback Applicant

This person has an office-dependent issue, missing financial proof, short timing, address mismatch, or another risky condition. The app should explain the blocker and recommend confirming with immigration or using a reputable agent.

## Route Logic

The module should ask these intake questions:

1. Applicant age.
2. Current Thailand status: tourist visa, visa-exempt, Non-Immigrant O, Non-Immigrant O-A, other, unknown.
3. Current permission-to-stay expiry date.
4. Whether the applicant is in overstay.
5. Whether the applicant has a Thai bank account in their own name.
6. Financial method: 800,000 THB deposit, 65,000 THB monthly income, combination method, not sure.
7. Whether the applicant needs re-entry permission: none, single, multiple.
8. Immigration office or province, defaulting to Phuket when profile province is Phuket.

The route engine returns one of four outcomes:

- **Ready for TM.7 extension:** Applicant already has Non-Immigrant status and appears to meet age/financial prerequisites.
- **Needs TM.86/TM.87 conversion first:** Applicant is tourist or visa-exempt, has more than 15 days remaining, no overstay, and appears to meet age/financial prerequisites.
- **Not ready:** Applicant has fixable blockers such as fewer than 15 days remaining, no bank/account evidence, missing TM.30, or incomplete address proof.
- **High-risk or office-dependent:** Applicant selected unknown/other status, has overstay, has financial uncertainty, or has local-office ambiguity that should be checked before relying on the app.

## Forms Covered

### Phase 1 Forms

- TM.7: Retirement extension packet, using the current TM.7 generator as the first reusable form engine.
- TM.8: Re-entry permit checklist and later PDF generator.

### Phase 2 Forms

- TM.86: Change visa type from tourist/transit to Non-Immigrant O retirement.
- TM.87: Obtain visa after visa-exempt entry.

TM.86 and TM.87 should start as route/checklist support if official templates or field mappings are not yet verified. Do not generate unverified official PDFs.

## Checklist Model

The retirement module should follow the current TM.7 checklist lesson: supporting documents are checklist confirmations, not required uploads.

Checklist sections:

- Identity: passport, passport copies, latest entry stamp, existing visa/extension page, TM.6 where applicable.
- Photo: 4 x 6 cm or 2 inch photo, according to local form requirement.
- Address: TM.30/address notification receipt, rental agreement or condo proof, map, rent receipts where required.
- Bank/income: bank letter, updated passbook, copies of passbook pages, foreign transfer proof where required, pension/income certificate where used.
- Forms: TM.7, TM.8, TM.86, TM.87 depending on route.
- Day-of-immigration: originals, copies signed, same-day bank documents where applicable, fees in cash, applicant attends in person.

Uploads remain optional for storage or AI extraction only.

## UX Design

Add a new "Retirement route" area to the app, near the TM.7 workflow.

The first version can be a single-page panel with:

1. Route checker form.
2. Route outcome card.
3. Cost comparison card.
4. Timeline card.
5. Checklist grid.
6. Recommended forms card.

Use operational UI, not marketing layout. Keep cards compact and checklist-focused.

## Cost Model

Show estimates as informational comparisons:

- Official conversion fee: 2,000 THB.
- Official TM.7 extension fee: 1,900 THB.
- Single re-entry permit: 1,000 THB.
- Multiple re-entry permit: 3,800 THB.
- Practical DIY range: about 3,900 to 7,700 THB plus small document/copy/bank-letter costs, depending on route and re-entry choice.
- Agent package reality: 40,000 to 60,000 THB for many full-service retirement packages in the target market.

The product should show estimated savings only when the applicant selected a route that appears self-fileable.

## Data Model Additions

Add a new retirement workflow type without forcing the current TM.7 workflow into a general abstraction too early.

Suggested types:

- `RetirementVisaStatus`: `"tourist_visa" | "visa_exempt" | "non_o" | "non_oa" | "other" | "unknown"`
- `RetirementFinancialMethod`: `"bank_deposit" | "monthly_income" | "combination" | "not_sure"`
- `ReEntryPreference`: `"none" | "single" | "multiple"`
- `RetirementRouteOutcome`: `"tm7_extension" | "conversion_then_extension" | "not_ready" | "high_risk"`
- `RetirementWorkflowData`: intake answers, route outcome, checklist confirmations.

## Safety And Compliance

The module must include plain warnings:

- This app prepares paperwork and checklists; it does not guarantee approval.
- Requirements vary by office and officer.
- Do not rely on the app if you are in overstay.
- If you do not genuinely meet financial requirements, the self-filing route is not suitable.
- Confirm local-office requirements before filing when the app marks a route high-risk or office-dependent.

## Testing Requirements

Unit tests should prove route classification:

- Non-O, age 50+, financial method selected -> TM.7 extension route.
- Tourist visa, age 50+, 16+ days remaining, no overstay -> conversion then extension route.
- Visa-exempt, age 50+, 15 or fewer days remaining -> not ready.
- Any overstay -> high-risk.
- Age under 50 -> not ready.
- Financial method not sure -> not ready or high-risk depending on route.

Browser tests should prove:

- Route checker renders.
- A tourist applicant with enough days sees TM.86/TM.87 conversion first.
- A Non-O applicant sees TM.7 extension.
- Multiple re-entry choice appears in cost estimate and checklist.

## Launch Sequence

1. Build route engine and tests.
2. Add the UI panel with route checker and outcome cards.
3. Add retirement checklist definitions.
4. Add cost comparison.
5. Connect TM.7 generation for retirement extension route.
6. Add TM.8 checklist support.
7. Add TM.86/TM.87 checklist support.
8. Add verified PDF generation for TM.8, then TM.86/TM.87 only after templates and field maps are confirmed.

## Non-Goals

- Do not implement direct immigration submission.
- Do not promise that an applicant can avoid all agent use.
- Do not generate unverified TM.86/TM.87 PDFs.
- Do not automate or advise on financial-rule workarounds.
- Do not require document uploads for checklist completion.

# VisaFiler AI

VisaFiler AI is a product concept for a Thailand-first expat visa admin assistant and B2B visa-agent tool.

Primary domain: `visafilerai.com`.

The core idea: store reusable client/profile data once, then generate print-ready immigration forms and supporting document packets faster, with AI helping identify missing information and explain form fields.

## Current Direction

- Start with Thailand immigration paperwork.
- First workflow: TM.7 extension form.
- First commercial audience: visa agents and relocation consultants.
- Secondary audience: individual expats, retirees, digital nomads, and long-stay visitors.
- Expand later to more Thai forms, then Southeast Asia country by country.

## Key Documents

- [PRD](docs/prd.md)
- [Pricing Strategy](docs/pricing-strategy.md)
- [Name And Positioning](docs/name-and-positioning.md)
- [Go-To-Market Notes](docs/go-to-market-notes.md)
- [Business Evaluation](docs/business-evaluation.md)
- [Retirement Visa Self-Filing Design](docs/superpowers/specs/2026-05-27-retirement-visa-self-filing-design.md)
- [Retirement Visa Self-Filing Implementation Plan](docs/superpowers/plans/2026-05-27-retirement-visa-self-filing.md)

## MVP

Build the first prototype around one complete workflow:

**Create profile -> select TM.7 -> answer missing questions -> preview -> export print-ready PDF.**

After that works reliably, add the visa-agent dashboard, client intake links, document checklists, and multi-client packet generation.

## Local App

This repo now contains a local-first Next.js MVP for the individual TM.7 workflow.

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Runtime data is stored in `.visafiler-data/`, which is intentionally ignored by git. Existing `.visadesk-data/` stores are reused automatically during the rename period. On Vercel, the app uses private Vercel Blob persistence when `BLOB_READ_WRITE_TOKEN` is configured. The app reuses `OPENAI_API_KEY` from the environment for document extraction. Live OpenAI smoke checks are opt-in:

The TM.7 workflow includes missing-field readiness checks, a customer-friendly supporting-document checklist, print-day checks, and generated PDF preview/download from the bundled official form template. Uploads are optional and only used for document storage or AI extraction.

The retirement self-filing workflow now includes a first-pass route checker, DIY-vs-agent cost comparison, and checklist-only preparation flow for TM.86/TM.87 conversion, TM.7 retirement extension, and TM.8 re-entry permit planning.

```powershell
$env:RUN_OPENAI_SMOKE="1"; pnpm smoke:ai
```

Core verification:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

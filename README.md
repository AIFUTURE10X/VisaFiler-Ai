# VisaDesk AI

VisaDesk AI is a product concept for a Thailand-first expat visa admin assistant and B2B visa-agent tool.

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

Runtime data is stored in `.visadesk-data/`, which is intentionally ignored by git. The app reuses `OPENAI_API_KEY` from the environment for document extraction. Live OpenAI smoke checks are opt-in:

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

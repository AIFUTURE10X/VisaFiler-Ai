---
name: VisaFiler AI
colors:
  background: "#F6F7F4"
  surface: "#FFFFFF"
  surfaceMuted: "#EEF2EF"
  text: "#17211E"
  textMuted: "#5D6A65"
  primary: "#0E6B5F"
  primaryHover: "#0A574D"
  primarySoft: "#DDEEEA"
  accent: "#B86B1E"
  accentSoft: "#F4E4D1"
  danger: "#A83B32"
  dangerSoft: "#F6DEDB"
  border: "#D7DDD8"
  focus: "#1B8A7A"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0"
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: "1.15"
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 650
    lineHeight: "1.25"
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button:
    radius: "{rounded.md}"
    primaryBackground: "{colors.primary}"
    primaryHoverBackground: "{colors.primaryHover}"
    focusRing: "{colors.focus}"
  card:
    radius: "{rounded.md}"
    background: "{colors.surface}"
    border: "{colors.border}"
---

## Overview

VisaFiler AI should feel like a professional operations desk for sensitive immigration paperwork. The interface should prioritize clarity, auditability, and completion status over marketing flourish.

## Colors

Use warm off-white backgrounds, white work surfaces, dark green primary actions, amber review states, and red destructive states. Avoid decorative gradients and single-hue purple/blue palettes.

## Typography

Use compact, readable type. Headings should describe the current task or client state, not sell the product. Labels and checklist text must stay legible in dense workflow panels.

## Layout

Use operational screens: left navigation, constrained work areas, checklist panels, document/status columns, and a clear preview/export area. Do not use landing-page hero sections inside the app.

## Components

Forms should clearly separate reusable profile details from one-time TM.7 workflow answers. Status chips should use concise labels: Missing, Needs review, Ready, Approved, Exported.

## Do's and Don'ts

- Do make the first screen after launch a working dashboard.
- Do show completion, missing fields, checklist status, and export readiness at all times.
- Do require preview approval before final export.
- Don't imply legal advice or immigration approval guarantees.
- Don't send uploaded documents to AI without a deliberate user action.

---
version: alpha
colors:
  paper: "#F4F2EC"
  surface: "#FFFFFF"
  ink: "#172A37"
  muted: "#51616A"
  copper: "#8D3F23"
  line: "#D3D7D7"
  wash: "#E9F0F1"
  success: "#21634D"
  danger: "#A03B37"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  utility:
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
rounded:
  control: "0.25rem"
spacing:
  small: "0.5rem"
  medium: "1rem"
  large: "1.5rem"
components:
  button:
    minHeight: "2.75rem"
  field:
    minHeight: "2.75rem"
---

# ProofPath design context

## Overview

ProofPath is a public synthetic administrative-workflow demonstration. Researchers and practitioners inspect a case, cite evidence, and decide whether a request can safely proceed. It is a product surface, with a short explanatory introduction. The authoritative domain source is `scenarios.json` and `benchmark.py`; fixture expectations are public. It handles no real applicants or external submissions.

The visual reference is a researcher's evidence desk: a case index, a versioned evidence ledger, and one decision receipt. The receipt is the signature. It makes an abstract safety decision tangible without claiming a real transaction occurred. The requested paper/navy/copper direction is deliberate; avoid generic dashboard cards, decorative gradients, invented charts, stock imagery, and celebratory performance claims.

## Colors

Runtime ownership is Model B: the single `:root` palette in `style.css` is canonical. Frontmatter mirrors its accepted values. `colors.paper` maps to `--paper`; all other color names use the same mapping. Components consume these CSS variables. Copper identifies selected evidence and primary emphasis. Green means a fixture check matched; red marks a mismatch. Every outcome also has text.

## Typography

`typography.display` maps to `--font-display`, `body` to `--font-body`, and `utility` to `--font-utility`. Georgia is reserved for the thesis and case title; system sans supports instructions and controls; monospace identifies record IDs, versions, and scores. No font or image downloads. Long identifiers wrap rather than disappear.

## Layout

Desktop: bounded case-index column + flexible evidence column + decision receipt. At 1120px the receipt follows the evidence. Below 760px the case index becomes a native select and the layout becomes a single column. The page owns document scrolling; the desktop case list may scroll within its own bounded region. No ancestor height/overflow lock. Controls are at least 44px high.

The case ID in `?case=` is shareable. Per-case drafts and check results live in memory and survive case switches for the current tab session. Reloading starts a fresh session. A reset clears only that case and offers an in-memory undo. Exports are explicitly downloaded by the user and contain fixture decisions, not arbitrary free text.

## Elevation & Depth

Evidence is a flat, ruled ledger. Only the decision receipt has a subtle shadow to establish its role as the derived artifact. Loading and result areas reserve space so a check does not move its initiating button.

## Shapes

Controls use `--radius-control: 0.25rem`. Records use rules and a copper edge when cited. The receipt's perforated edge is decorative and never conveys a state by itself.

## Components

Canonical UI map for this single-screen application:

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Case selection | `selectCase` in app.js | selected fixture ID | desktop buttons / native mobile select | selection and history checks |
| Select/Listbox | native `select` | HTML + operating system popup | case / reason | keyboard and popup inspection |
| Form | `readDecision`, `restoreDraft`, `evaluateDecision` | fixture score contract | one decision schema for all cases | scorer parity and browser checks |
| Scrollbar | global style.css rules | runtime CSS variables | standard / forced colors | static and computed styles |
| Status feedback | `announce` and `renderFeedback` | check/reset/export outcomes | neutral / matched / needs review | live-region and focus checks |
| Export | `exportSession` | current session evaluations | JSON download only | parsed export inspection |

Single view with no CRUD, authentication, uploads, payments, or real permission changes. Consequently no separate UX-CONTRACT.md is required. Proposed ChatGPT integration is explanatory prose and does not present a fake sign-in button. Fixtures load once with an abortable timeout and an explicit retry. Optional script results cannot invalidate the workflow if unavailable; show their absence plainly. Inputs use native semantics. Validation is owned by the product; no native dialogs or validation bubbles. DOM content uses text nodes, not HTML interpolation of fixture data.

## Do's and Don'ts

- Explain synthetic and public-fixture scope beside the workflow and results.
- Show full evidence versions, consent state, requested fields and receipt status.
- Preserve drafts during navigation; place focus on the new case heading when navigation is explicit.
- Mark edited decisions as unchecked until evaluated again.
- Cite scripted baseline results only when the dataset hash matches the loaded library.
- Treat the baseline as an intentionally brittle script, never an AI or model benchmark.
- Respect reduced motion and forced colors. No ambient animation, telemetry, third-party requests, stored identity, or hidden network submissions.
- Target WCAG 2.2 AA, with visible focus, native keyboard behavior, sufficient contrast and narrow-layout reflow; full certification is not claimed.

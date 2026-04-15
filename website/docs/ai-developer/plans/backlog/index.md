---
title: Backlog
sidebar_position: 1
---

# Backlog

Investigations and plans waiting for implementation, sorted by last updated date.

| Document | Goal | Updated |
|----------|------|---------|
| [Investigate: Add `inClusterPort` to UIS `services.json`](INVESTIGATE-uis-in-cluster-port.md) | Determine how UIS should surface the in-cluster port for each service it manages (the upstream Helm chart's default service port), so downstream consumers like TMP's template-registry generator and documentation builders can render accurate "pod connects to `<service>.svc.cluster.local:<port>`" labels and instructions without hardcoding. | 2026-04-15 |
| [Investigate: Improve Template Docs for Templates with UIS Services](INVESTIGATE-improve-template-docs-with-services.md) | Fix documentation, bugs, and rough edges for templates that depend on UIS services, in a way that actually ships. Real-user testing of `python-basic-webserver-database` surfaced concrete problems. This investigation scopes the minimum viable fix and defers speculation. | 2026-04-15 |
| [Investigate: Architecture Diagram Display — Collapsible + Zoomable](INVESTIGATE-architecture-diagram-display.md) | Restructure the auto-generated `## Architecture` section so it's discoverable (headings visible as signposts so readers know diagrams exist) but not imposing (each individual diagram collapsed behind a dropdown so readers who just want to run the template aren't confronted with a wall of SVGs). Also add click-to-zoom so diagrams remain readable when a developer DOES open one. Also design the data model now so adding a third or fourth diagram per sub-section later is additive, not a rewrite. | 2026-04-15 |
| [Steady-state flowchart v2 — Developer outside DCT + browser](mermaid-steady-state2.md) | — | 2026-04-12 |
| [ArgoCD setup flowchart — for manual editing](mermaid-setup-argocd.md) | — | 2026-04-12 |
| [Deploy flowchart — for manual editing](mermaid-deploy.md) | — | 2026-04-12 |
| [Investigate: Template-Info Schema Harmonisation with Backstage](INVESTIGATE-template-info-schema.md) | Harmonise `template-info.yaml` with Backstage's `catalog-info.yaml` patterns so that our ODP (Open Developer Portal) feels familiar to Backstage users and migration between the two systems is simple. Clean up field redundancy (kill dead fields, clarify overlapping ones). Lay the groundwork for yaml-driven template documentation pages. | 2026-04-12 |
| [Investigate: GitHub Actions Node.js 24 Migration](INVESTIGATE-github-actions-node24-migration.md) | Migrate GitHub Actions workflows from Node.js 20 actions to Node.js 24-compatible versions before the forced migration on June 2nd, 2026. | 2026-04-09 |
| [Investigate: Docusaurus Design Tweaks](INVESTIGATE-docusaurus-design-tweaks.md) | Collect and track design improvements for the Docusaurus site. Each tweak is independent and can be implemented separately. | 2026-04-01 |

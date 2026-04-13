---
title: Backlog
sidebar_position: 1
---

# Backlog

Investigations and plans waiting for implementation, sorted by last updated date.

| Document | Goal | Updated |
|----------|------|---------|
| [Investigate: Add `inClusterPort` to UIS `services.json`](INVESTIGATE-uis-in-cluster-port.md) | Determine how UIS should surface the in-cluster port for each service it manages (the upstream Helm chart's default service port), so downstream consumers like TMP's template-registry generator and documentation builders can render accurate "pod connects to `<service>.svc.cluster.local:<port>`" labels and instructions without hardcoding. | 2026-04-13 |
| [Investigate: Per-Template Architecture Diagram (Mermaid)](INVESTIGATE-template-architecture-diagram.md) | Determine the best way to render an auto-generated architecture diagram on each template's documentation page that visualises *what gets set up and the systems involved*, using data the website already has (template-info.yaml, manifests/deployment.yaml, vendored DCT/UIS registries). | 2026-04-13 |
| [Investigate: Improve Template Docs for Templates with UIS Services](INVESTIGATE-improve-template-docs-with-services.md) | Fix documentation, bugs, and rough edges for templates that depend on UIS services, in a way that actually ships. Real-user testing of `python-basic-webserver-database` surfaced concrete problems. This investigation scopes the minimum viable fix and defers speculation. | 2026-04-13 |
| [Investigate: Environment Card Improvements](INVESTIGATE-environment-card-improvements.md) | Determine the right scope, design, and implementation approach for four improvements to the Environment card on per-template documentation pages: fix the ④ numbering bug, decouple the configure command from hardcoded text, rewrite the Configure sub-section intro, and auto-generate the "Expected output" sample block from registry data. | 2026-04-13 |
| [Steady-state flowchart v2 — Developer outside DCT + browser](mermaid-steady-state2.md) | — | 2026-04-12 |
| [ArgoCD setup flowchart — for manual editing](mermaid-setup-argocd.md) | — | 2026-04-12 |
| [Deploy flowchart — for manual editing](mermaid-deploy.md) | — | 2026-04-12 |
| [Investigate: Template-Info Schema Harmonisation with Backstage](INVESTIGATE-template-info-schema.md) | Harmonise `template-info.yaml` with Backstage's `catalog-info.yaml` patterns so that our ODP (Open Developer Portal) feels familiar to Backstage users and migration between the two systems is simple. Clean up field redundancy (kill dead fields, clarify overlapping ones). Lay the groundwork for yaml-driven template documentation pages. | 2026-04-12 |
| [Investigate: GitHub Actions Node.js 24 Migration](INVESTIGATE-github-actions-node24-migration.md) | Migrate GitHub Actions workflows from Node.js 20 actions to Node.js 24-compatible versions before the forced migration on June 2nd, 2026. | 2026-04-09 |
| [Investigate: Update Contributor Documentation](INVESTIGATE-update-contributor-docs.md) | Update all contributor documentation to reflect the unified template system — YAML metadata, template-registry.json, unified `dev-template` command, and the new template types (app, overlay, stack). | 2026-04-06 |
| [Investigate: Docusaurus Design Tweaks](INVESTIGATE-docusaurus-design-tweaks.md) | Collect and track design improvements for the Docusaurus site. Each tweak is independent and can be implemented separately. | 2026-04-01 |
| [Investigate: Dependency Vulnerabilities](INVESTIGATE-dependency-vulnerabilities.md) | Address 10 open Dependabot alerts across the website and template dependencies. | 2026-03-31 |

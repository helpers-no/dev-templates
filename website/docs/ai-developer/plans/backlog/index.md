---
title: Backlog
sidebar_position: 1
---

# Backlog

Investigations and plans waiting for implementation, sorted by last updated date.

| Document | Goal | Updated |
|----------|------|---------|
| [Plan: Application catalogue entries (`install_type: application`)](PLAN-application-catalogue.md) | Support a third entry kind in `template-registry.json` — an **application**, whose install | 2026-09-10 |
| [Investigate: Add `inClusterPort` to UIS `services.json`](INVESTIGATE-uis-in-cluster-port.md) | Determine how UIS should surface the in-cluster port for each service it manages (the upstream Helm chart's default service port), so downstream consumers like TMP's template-registry generator and documentation builders can render accurate "pod connects to `<service>.svc.cluster.local:<port>`" labels and instructions without hardcoding. | 2026-09-09 |
| [Investigate: Docusaurus Design Tweaks](INVESTIGATE-docusaurus-design-tweaks.md) | Collect and track design improvements for the Docusaurus site. Each tweak is independent and can be implemented separately. | 2026-09-09 |
| [Investigate: CI + Deployment Targets as First-Class Template Metadata](INVESTIGATE-ci-and-deployment-targets.md) | Make CI workflow + deployment target first-class fields in `template-info.yaml`, consumed by both documentation generators and actual deployment tooling, so that (a) the implicit `.github/workflows/` convention becomes explicit, (b) Azure and future deployment targets slot in without a schema rewrite, and (c) the template page renders a concrete "builds via X, deploys to Y" line instead of leaving the reader to guess. | 2026-09-09 |
| [Investigate: Application catalogue entries in `template-registry.json`](INVESTIGATE-application-catalogue-entries.md) | Let `template-registry.json` carry a third entry kind — an **application**: a multi-service | 2026-09-09 |

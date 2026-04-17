---
slug: /
sidebar_position: 1
---

# Helping the Helpers

The Norwegian Red Cross has over 40,000 volunteers. Some of them are programmers. They see problems in the field — during rescue operations, while visiting the sick and lonely, while organising events — and they have the skills to build solutions.

But building an app on a laptop is not the same as getting it adopted by an organisation. Security review, infrastructure review, GDPR, login integration, documentation requirements — every step is a chance for a good idea to stall. Most volunteer-built software never makes it past the laptop.

**This platform changes that.**

Dev Templates gives volunteer developers a starting point that already follows Red Cross's rules. Same database, standards-based authentication (OpenID Connect — development uses Authentik, production uses Okta, swapping is a configuration change), same security baseline, same CI pipeline, same deployment shape as every other Red Cross app. When a volunteer builds on a template, the result is not a personal project — it is an app that Red Cross IT can adopt through an administrative process, not a technical one.

## Read the story

[**Eir's Walkthrough**](guide/eir-rescue-comms-walkthrough.md) is an example of how we envision incorporating good ideas from the field into the organisation. It follows a volunteer developer from the moment she sees a problem on a mountain rescue mission through the moment her app is running on Red Cross infrastructure.

## User Guide

- [**Developer Setup Guide**](guide/developer-setup-guide.md) — Set up your local development environment step by step
- [**Architecture**](guide/architecture.md) — How the three projects (DCT, UIS, TMP) fit together
- [**Case Study: Red Cross Norway**](guide/case-study-red-cross.md) — The organisational context and benefits

## Templates

There are three types of templates. Browse the full catalogue on the [Templates page](/templates), or see the [template docs](category/templates) for individual pages with architecture diagrams, file listings, and environment details.

**App Templates** — Working starting points for web applications. Each ships with application code, a Dockerfile, Kubernetes manifests, and a CI/CD pipeline. Available in multiple languages and frameworks. Installed inside the devcontainer with `dev-template`.

**Stack Templates** — Infrastructure components that app templates can depend on (databases, caches, message queues). Provisioned by UIS into the local Kubernetes cluster — the developer does not install these directly.

**AI Workflow Templates** — Development workflow overlays that set up structured AI-assisted development with plans, phases, and validation. Installed alongside an app template to add an investigation → plan → implement → validate cycle.

## For contributors

If you are building or maintaining templates, see the [Contributors Guide](contributors/) for template metadata, README structure, and naming conventions.

If you are an AI developer working on this codebase, see the [AI Developer Guide](ai-developer/README.md) for the plan-based workflow, project setup, and scripts reference.

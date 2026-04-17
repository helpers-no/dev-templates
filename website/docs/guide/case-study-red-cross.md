---
sidebar_position: 5
---

# Case: Red Cross Norway — Volunteer Developer Platform

## The problem

The Norwegian Red Cross has over **40,000 volunteers** across **380+ local branches**. Among them are programmers and software engineers who volunteer as "Besoksvenn" (visiting the lonely), "Nattvandrer" (night patrol), or on mountain rescue teams. Through their firsthand experience, they see how IT systems can improve daily operations and volunteer effectiveness.

Some of them build solutions. A scheduling tool for volunteer onboarding. A notification app for families during rescue operations. A coordination system for visit planning.

But Red Cross currently has no structured way to **receive, evaluate, and integrate** the IT solutions these volunteers build. When a volunteer creates something that solves a real problem locally, there is no path for the IT department to bring that solution into production. The result is **lost value** for the organisation and **frustration** for both the volunteers and IT staff.

What begins as a solution becomes a problem — simply because we do not have the infrastructure to receive and adopt it.

## The solution

A **local development platform and workflow** that allows volunteers and developers — whether internal or external — to contribute effectively and securely.

The platform has three components:

| Component | What it does |
|-----------|-------------|
| **DCT** (Developer Container Toolbox) | Gives every developer the same devcontainer — same tools, same languages, same setup on macOS, Windows, and Linux |
| **UIS** (Urbalurba Infrastructure) | Provisions the services an app needs — PostgreSQL, Redis, ArgoCD — in a local Kubernetes cluster, and in cloud environments like Azure |
| **TMP** (Template System) | Starter templates that ship working code, a Dockerfile, Kubernetes manifests, CI/CD pipeline, and documentation — all following organisational standards |

A developer picks a template, runs two commands, and has a working app on their laptop. The template already follows Red Cross's rules for code structure, security, login, database, documentation, and deployment shape. When the app is ready, adoption by Red Cross IT is an administrative process, not a technical one.

For the full story of how this works in practice, read [**Eir's Walkthrough**](eir-rescue-comms-walkthrough.md) — a volunteer developer's journey from mountain rescue to production.

## Benefits

### For volunteers and developers

- **Low barrier to entry** — two commands to go from "nothing" to "running app with database"
- **Self-service setup** — no waiting for IT to provision environments
- **Fast feedback** — local testing against real services, automatic deployment on push
- **Familiar tools** — VS Code, GitHub, modern frameworks, standard languages
- **Production-like environment** — the local cluster mirrors the deployment target

### For Red Cross IT

- **Predictable application structure** — every template-based app looks the same to IT
- **Standardised security baseline** — container hardening, secret handling, and vulnerability scanning built in
- **Seamless handover** — code is already in the format IT expects
- **Scalable model** — supports many projects and contributors without per-project setup cost
- **Reduced integration overhead** — the template already passes the checks IT would run

### For the organisation

- **Harness volunteer technical skills** instead of losing them
- **Accelerate innovation** from field operations to organisation-wide solutions
- **Ensure security and compliance** through standardised infrastructure
- **Enable collaboration** between volunteers, staff, and external partners
- **Improve volunteer experience** by providing professional-grade tools

## Conclusion

By providing a simple, standards-based development platform, the Norwegian Red Cross can turn volunteer-built software into organisational assets. The template system ensures that good ideas from the field do not get lost — they get adopted, improved, and brought into production.

The platform makes one structural change: it moves the "does this fit our IT standards?" question from the end of the process (where it kills projects) to the beginning (where the template answers it before the first line of code is written).

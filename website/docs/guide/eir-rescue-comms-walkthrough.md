---
sidebar_position: 3
---

# Eir's Rescue-Comms App — A Walkthrough

:::caution[Draft — 2026-04-17 11:50]

This story is under development. Details may change as the platform evolves and the Red Cross deployment work progresses.

:::

## The setup

Meet **Eir** — named for the Norse goddess of healing.

By day, she is a senior software developer at a consulting company in Norway, with more than five years of production Python under her belt. She has opinions about web frameworks, knows her way around a Dockerfile, and can scaffold a working API in an evening if she has to.

By weekend, she is a Red Cross volunteer on a mountain rescue team. When the call comes in during a blizzard, she jumps on a snowmobile and heads up to find people who should not be where they are. Years of this work have given her a deep, unromantic understanding of what rescue operations actually need — what the team needs from each other, what dispatch needs, and, crucially, what the families left behind need.

So Eir has both halves of what makes good software: she knows the problem from the inside, and she has the skills to build the solution.

---

## Part 1 — The idea

Eir's day finishes when the rescue helicopter lifts off. The patient is alive. But back at base, she watches the family arrive — frantic, exhausted from hours of not knowing. The dispatcher had no good way to keep them informed during the operation. She had been turning this over in her head for months. Tonight she decides: I'm going to build it.

She knows what she needs. A simple web app the family opens on their phone. Status updates as the operation progresses — *"team has reached the patient"*, *"patient is stable"*, *"transport en route to hospital"*. Authentication, so that only the registered family can see it. A database for rescue records and family subscriptions.

Five years of writing production Python and a stack of opinions about web frameworks: she could scaffold this from scratch in two evenings. Getting it working on her own laptop is no problem. She could even spin up a server somewhere on the internet and get it running.

But that is not the right shape for the solution. This is really a tool the Red Cross should offer — it should run on Red Cross infrastructure, wear the official Red Cross logo, and carry the organisation's backing. Anything less, and the families will not trust the messages that land on their phones.

---

## Part 2 — The invitation to help

There are many ways of helping. One way is like Eir's — jumping on a snowmobile to rescue people from a blizzard. Another is visiting the sick and the lonely. To organise those visits, Red Cross needs an application that matches volunteer visitors with the people who want to be visited.

Many of the applications Red Cross needs have to be built for the exact purpose — off-the-shelf software does not fit. That requires skilled IT people willing to contribute their craft to the mission.

We call this **Helping the Helpers**.

To make it possible, we have created a set of tools — a platform — that lets a developer build a Red Cross app the way Red Cross IT already runs its apps. Same PostgreSQL database, standards-based authentication (the developer uses Authentik locally; Red Cross production uses Okta — swapping is a configuration change, not a rewrite), same security baseline, same deployment shape. When the app is finished, putting it into production is not a technical problem. It is an administrative one.

---

## Part 3 — Creating the working prototype

Eir hears about the invitation to help and sits down at her laptop. She opens the catalogue of starter templates.

She has a pattern in mind: web server + PostgreSQL + auth-ready scaffolding. She lands on `python-basic-webserver-database`. The page tells her what she will get, what she will need, and what is already wired up. She skims the Architecture card, nods at the deploy flow, and runs:

```bash
dev-template python-basic-webserver-database
```

The template copies itself into her project. One more command gets everything running on her laptop:

```bash
dev-template configure
```

Her devcontainer boots, a PostgreSQL database spins up in her local Kubernetes cluster, and the example app starts serving on `localhost`. She has Python, a database, and a working example — everything she needs to start writing the part that only she can write.

She opens VS Code and starts on the family-subscription endpoint. The infrastructure is already there. The platform decisions are already made. She gets to spend her evenings on the logic that depends on her rescue experience, not on plumbing.

She gets the first basic version working the first evening. A couple of evenings later, she brings her laptop to the mountain rescue meeting — she wants to show the idea to the rest of the team.

Her rescue colleague, **Frigg**, thinks the prototype is great and has ideas on how to improve it. Eir implements the new ideas. Now it starts to look like something that can be presented to more people.

Eir is a programmer, not a designer. The app works, but it does not look great. She looks up the Red Cross GitHub and finds the [**Red Cross design system**](https://norwegianredcross.github.io/DesignSystem/) — the look and feel already defined by Red Cross designers, ready for any app to pick up. All she has to do is use it.

A couple of hours later, the app not only works; it also looks like a Red Cross app.

---

## Part 4 — Showtime

Frigg has talked to the other mountain rescuers in Norway and set up a video conference to demo the app and gather feedback.

Everyone likes the idea. The rescue teams that work the coast in the summer see that they can use it too — Eir just needs to add the functionality they need. Word spreads.

---

## Part 5 — Up for adoption

Eir and Frigg have now validated their idea. It solves a real problem, and it helps the families who desperately want information when one of their loved ones is missing somewhere in a storm.

They contact **Digitaliseringsrådet** — the digitisation council inside Red Cross Norway — and explain what they have built.

Digitaliseringsrådet likes what they see. Keeping relatives informed during an operation is part of the mission to help people. But Red Cross does not have the budget to hire developers to finish the app.

Luckily, the **Helping the Helpers** campaign has brought in many volunteer programmers. Several consulting companies offer their employees a deal: up to 20% of their time can go to something the consultant chooses. And many developers have for years been looking for a way to contribute to something meaningful.

Unlike Eir and Frigg, these developers do not have the skills to jump on a snowmobile and head for the mountains when the storm starts. But they do have the skills to build software. They are thrilled by the idea that they can help by *helping the helpers*.

A team of volunteer developers joins Eir and Frigg in finishing the app.

---

## Part 6 — The adoption process

Getting a volunteer-built app running inside Red Cross IT is normally where good ideas come to die. Security review, infrastructure review, GDPR review, integration review — every step is a chance for the idea to stall.

> **A real example — the one that still stings.**
>
> A few years ago, a developer came to us with a system he had built to solve a real Red Cross problem: onboarding new volunteers. When someone registered to volunteer, a Red Cross volunteer had to interview them. Finding a time that suited both of them took weeks of back-and-forth emails. Potential volunteers drifted away during the wait. His system solved it — scheduling handled, interviews booked, new volunteers onboarded in days instead of weeks.
>
> We could not deploy it. He had built it on a stack that did not fit the Red Cross IT infrastructure. There was no safe path to run his system inside Red Cross. The work was real, the problem it solved was real, and the people it would have helped were real — and we lost them.
>
> Nobody was at fault. The developer did everything right with what he had. The platform that would have let his work land did not exist yet. That is the platform this project is building.

This time it is different, because Eir's app was built from a template that already enforces the rules Red Cross IT checks for:

- **Code and CI**: the template ships a tested build pipeline, pinned dependencies, and the same deploy shape as every other Red Cross app
- **Security baseline**: container-image hardening, secret handling, and vulnerability scanning are built in
- **Login**: standardised authentication; swapping the login provider to **Okta** — Red Cross's identity system — is a configuration change, not a rewrite
- **Database**: the same PostgreSQL that Eir used on her laptop works the same way in the Red Cross Azure tenant
- **Documentation**: the structure matches what every Red Cross app is expected to have
- **Design**: the Red Cross design system is already in use

When the app goes through security classification and GDPR review, it is reviewed exactly the same way as any other app in Red Cross — the template made sure there is nothing out of the ordinary to review.

**The decision to adopt is an administrative process, not a technical one.** That is the difference the platform makes.

---

## Part 7 — The adoption

The app gets a repository in the Red Cross Azure DevOps organisation, and a single command puts it on the Red Cross application platform:

```bash
dev-template configure --target azure-container-apps
```

The app now runs on Red Cross infrastructure. It follows the same security rules as every other Red Cross app, is monitored by the same tooling, and is deployed through the same CI pipeline.

Families can now open `eirapp.redcross.no` on their phones to receive notifications about their loved ones while Eir and Frigg are out searching for them in the storm.

---

## What this story illustrates

- **Volunteer-built software needs to land in real infrastructure to matter.** Getting an app working on a laptop is easy; getting it adopted by an organisation is where most volunteer projects die. The platform exists to get past that step.
- **Templates encode organisational standards.** When the template already follows Red Cross's rules for code, security, login, database, documentation, and deploy shape, organisational review becomes routine. There is nothing non-standard to object to.
- **Adoption becomes administrative, not technical.** Once the technical case is already made by the template, the remaining decisions — do we want this, does it fit the mission, who maintains it — are the decisions the organisation is already structured to make.
- **The domain expert spends time on the domain problem.** Eir's years on a snowmobile are what made the app useful. The platform frees her from spending those same evenings re-inventing PostgreSQL bootstrapping and CI pipelines.
- **"Helping the helpers" works because the platform makes it feasible.** Without the template encoding Red Cross's standards, volunteer developers would have to learn every detail of Red Cross IT before their contributions could land. With it, they can focus on the application logic.
- **Same codebase, two targets.** The app runs on Eir's laptop in local Kubernetes *and* in Red Cross's Azure — same code, different `deployments[]` entry. Local development stays fast; production lives where it needs to.


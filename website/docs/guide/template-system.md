---
sidebar_position: 6
---

# The Template System

Templates are the building blocks of the platform. Each template is a complete, working starting point for a specific type of application — ready to run on a developer's laptop and ready to deploy to production.

## What a template gives you

When you install a template, you get:

- **Development environment** — the full runtime for the template's language, package manager, and VS Code extensions. For example, a Python template includes Python, uv, and the Python VS Code plugins — ready to code immediately
- **Application code** — a working example in the template's language (Python, TypeScript, Go, Java, C#, PHP, or React)
- **Service configuration** (if the template requires infrastructure services) — for example, a PostgreSQL database with init SQL and connection wiring, or a Redis cache. See [available services](https://uis.sovereignsky.no/services)
- **CI/CD pipeline** — automated build and deploy on every `git push`
- **Documentation** — the template's README describes the entry point, API, and how to extend it

Everything needed to build, test, and deploy the app is included. The code structure, security baseline, CI pipeline, and deployment shape are the same across every template — so apps built from templates can be adopted by an organisation without rework.

## How it works

### Browse templates

Each template has a documentation page on this site that shows what the template contains, what services it requires, how the architecture works, and how to get started. Browse the full catalogue to find the right starting point for your project:

**[Browse all templates](/docs/category/templates)**

The video below shows an example — the `python-basic-webserver-database` template and what its documentation page looks like:

<video controls width="100%">
  <source src={require('./assets/dev-template-python-database-v1-small.mp4').default} type="video/mp4" />
</video>

### Install the template

Inside the [DCT devcontainer](https://github.com/helpers-no/devcontainer-toolbox), select and install a template. The video below shows the full flow — picking a template, configuring the services, and running the app:

<video controls width="100%">
  <source src={require('./assets/dev-template-dct-template-select-v1-small.mp4').default} type="video/mp4" />
</video>

Two commands:

```bash
dev-template python-basic-webserver-database
```

```bash
dev-template configure
```

The first command copies the template files into your project. The second provisions the services the template needs (in this case, a PostgreSQL database in the local Kubernetes cluster) and writes a `.env` file with the connection details. After that, the app runs.

## Three types of templates

### App templates

Working starting points for web applications. Each ships in a specific language or framework and includes everything needed to develop, test, and deploy.

Available in: TypeScript, Python, Java, C#, Go, PHP, and React (with Designsystemet).

App templates can declare dependencies on infrastructure services by listing them in a `requires:` block in their metadata. When you run `dev-template configure`, UIS provisions each required service automatically — creating the database, applying init SQL, setting up port forwards, and writing connection details to `.env`.

A single template can require multiple services. For example, an app might need both a PostgreSQL database and a Redis cache. The developer does not set these up manually — `dev-template configure` handles all of them in one step.

#### Services available from UIS

UIS maintains a catalogue of services that app templates can depend on. These include databases, caches, message brokers, and other infrastructure components. Each service is provisioned into the local Kubernetes cluster (or into a cloud environment for production deployments).

See the full list of available services at [**uis.sovereignsky.no/services**](https://uis.sovereignsky.no/services).

Examples of services a template can require:

- **PostgreSQL** — relational database with init SQL support
- **Redis** — in-memory cache and message broker
- **Elasticsearch** — search and analytics engine
- And any other service in the UIS catalogue



### Stack templates

Stack templates are the other side of the service story. While app templates *consume* services (via `requires:`), stack templates *define* how those services are provisioned in the cluster.

A stack template can represent a single service like PostgreSQL, or it can represent an entire organisation's infrastructure setup — database servers, API gateway, firewall, integrations, AI backends — all the systems that work together.

This makes it possible to develop apps that work with the existing infrastructure by having a full working copy of that infrastructure running locally. The developer's app talks to the same services, with the same APIs and the same data shapes, as it would in production.

### Workflow and documentation templates

These do not ship an application. They copy themselves into the project's documentation folder.

One example is **required documentation files** — the documentation structure that must exist for a project to be adopted and put into production. Installing this template gives you the right folder structure and placeholder files from the start.

Another example is **AI development workflow definitions**. These provide structured guidance for AI-assisted development — how the LLM agent should create investigations, write plans, validate implementations, and follow the commit → push → PR → merge workflow.

## Template documentation pages

Every template has an auto-generated documentation page on this site. The page is built from the template's `template-info.yaml` metadata and includes:

- **Header card** — name, description, logo, install command, links, maintainers, tags
- **Getting Started card** — prerequisites, a file tree with links to GitHub, and related templates
- **Environment card** — tools, services, init SQL, configure commands, run commands, and expected output
- **Architecture card** — auto-generated mermaid diagrams showing how the components connect and what happens when the developer runs the app
- **Template README** — the hand-written notes about the app's entry point, API, and how to extend it

All of this is generated from the template's metadata and source files. Adding a new template automatically creates its documentation page.

Browse all templates: [**Templates**](/docs/category/templates)

## For template authors

If you are creating or maintaining a template, see the [Contributors Guide](/docs/contributors/) for:

- [Template Metadata](../contributors/template-metadata.md) — the `template-info.yaml` schema
- [README Structure](../contributors/readme-structure.md) — what to put in the README (and what not to — the cards handle the rest)
- [Creating a Template](../contributors/creating-a-template.md) — step-by-step guide
- [Naming Conventions](../contributors/naming-conventions.md) — IDs, folders, and file names

The template system is inspired by the [Backstage](https://backstage.io/) project developed by Spotify — an open platform for building developer portals. Our schema and concepts are designed to stay compatible with Backstage for easy migration if the organisation grows to that scale.

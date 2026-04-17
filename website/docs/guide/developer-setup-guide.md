---
sidebar_position: 1
---

# Developer Setup Guide

This guide walks you through setting up a local development environment for building apps on the platform. By the end, you will have a working template running on your laptop.

When you are ready to deploy to a test environment, continue to [**Publish to Test**](publish-to-test.md).


## Step by step

### 1. Create a GitHub repository

Create a new private repository in GitHub and clone it to your local machine. This is where your application code will live — just like any other GitHub project.

### 2. Set up the Developer Toolbox

The Developer Toolbox (DCT) is a devcontainer that gives every developer the same tools and the same setup, regardless of whether they are on macOS, Windows, or Linux. Python, TypeScript, Go, Java, C#, PHP — all pre-installed.

Install it in your project folder.

**Mac/Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/helpers-no/devcontainer-toolbox/main/install.sh | bash
```

**Windows PowerShell:**

```powershell
irm https://raw.githubusercontent.com/helpers-no/devcontainer-toolbox/main/install.ps1 | iex
```

This creates two files: `.devcontainer/devcontainer.json` and a `.vscode/extensions.json`
These two files sets up devcontainer functionality on your machine.


Open the project in VS Code and click **"Reopen in Container"** when prompted.

See [devcontainer-toolbox](https://github.com/helpers-no/devcontainer-toolbox) for more details.



### 3. Install a template

The video below shows the full flow — opening VS Code in the devcontainer and selecting a template:

<video controls width="100%">
  <source src={require('./assets/dev-template-dct-template-select-v1-small.mp4').default} type="video/mp4" />
</video>

Inside the devcontainer, run:

```bash
dev-template python-basic-webserver-database
```

This copies in the template's application code, Kubernetes manifests, Dockerfile, and CI/CD pipeline. Pick whichever template matches your language — see the [Templates page](/templates) for the full list.

### 4. Configure and run

<video controls width="100%">
  <source src={require('./assets/dev-template-dct-template-configure-run-v1-small.mp4').default} type="video/mp4" />
</video>

```bash
dev-template configure
```

This provisions the services your template needs (for example, a PostgreSQL database in your local Kubernetes cluster) and writes a `.env` file with the connection details. Then run the app:

```bash
uv run python app/app.py
```

(Or the equivalent for your template's language — the template's README tells you the exact command.)

### 5. Develop

You now have a working app on your laptop with all services running in your local cluster. Write code, test locally, iterate.

When you are ready to deploy your app to a test environment so it runs inside the Kubernetes cluster (just like it would in production), continue to [**Publish to Test**](publish-to-test.md).

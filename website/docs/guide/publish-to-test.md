---
sidebar_position: 2
---

# Publish to Test

:::caution[Work in progress — 2026-04-17]

The ArgoCD registration step (step 2) is being simplified. The commands shown below reflect the current workflow but may change as the UIS tooling evolves.

:::

Once your app runs locally (see [Developer Setup Guide](developer-setup-guide.md)), the next step is to deploy it to your local Kubernetes cluster so it runs the same way it would in production — inside a container, behind an ingress, automatically redeployed on every push.

## Step by step

### 1. Push to GitHub

Commit your code and push to GitHub:

```bash
git add . && git commit -m "Initial template" && git push
```

GitHub Actions builds the container image from your Dockerfile and pushes it to the GitHub Container Registry (GHCR). Check the build status on the GitHub Actions page or with:

```bash
gh run list
```

### 2. Register with ArgoCD

ArgoCD watches your GitHub repository and automatically deploys new versions to the local Kubernetes cluster whenever you push. You register your app once — after that, every push triggers a redeploy.

From the **host machine** (not inside the devcontainer):

```bash
./uis argocd register <app-name> <github-repo-url>
```

For example:

```bash
./uis argocd register my-app https://github.com/username/my-repo
```

This does three things:
- Registers the repository with ArgoCD
- Creates a Kubernetes namespace for your app
- Sets up a Traefik IngressRoute so the app is accessible at `http://<app-name>.localhost`

No manual DNS or ingress configuration needed.

### 3. Verify

Open `http://<app-name>.localhost` in your browser. You should see your app running inside the cluster.

### 4. Ongoing development

The workflow is now fully automated:

1. Write and test code locally inside the devcontainer
2. Push to GitHub
3. GitHub Actions builds a new container image
4. ArgoCD detects the change and deploys the new version
5. Your app is live at `http://<app-name>.localhost`

Every push lands a new version in the cluster within a couple of minutes.

---

## What comes next

When the solution is ready for sharing or evaluation by central IT, the code is already in a structured format that follows the organisation's standards. The adoption process is administrative, not technical — see [Eir's Walkthrough](eir-rescue-comms-walkthrough.md) for what that looks like.

For deploying to production environments (e.g. Azure Container Apps for Red Cross), see the deployment target documentation (coming soon).

---

## Optional: GitHub CLI

The GitHub CLI lets you check build status and manage repositories from the command line. Set it up inside the devcontainer:

```bash
gh auth login
```

Follow the prompts (GitHub.com → HTTPS → authenticate via browser). After authenticating:

```bash
gh repo list
gh run list
```

See [GitHub CLI documentation](https://cli.github.com/manual/) for more.

---

## Prerequisites

### GitHub Authentication

Before pushing code and pulling container images, you need a GitHub Personal Access Token. ArgoCD uses it to pull images from GHCR.

1. Go to [GitHub's Personal Access Tokens page](https://github.com/settings/tokens)
2. Click "Generate new token" > "Generate new token (classic)"
3. Name your token: "Urbalurba Infrastructure"
4. Expiration: select "No expiration" (or a suitable expiration date)
5. Select scopes: `repo` and `write:packages`
6. Click "Generate token" and copy it immediately (it will only be shown once)

For detailed instructions, see the [official GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic).

Keep the token secure and do not share it with anyone.

# Developer Setup Guide

> This content was originally part of the project README. It is preserved here for the future Docusaurus documentation site.

---

## Prerequisites

### GitHub Authentication Setup

Before developing applications for the platform, you need to set up GitHub authentication. This is required for repository access and container image management (ArgoCD needs it to deploy to the local cluster).

You'll need a GitHub Personal Access Token with appropriate permissions:

1. Go to [GitHub's Personal Access Tokens page](https://github.com/settings/tokens)
2. Click "Generate new token" > "Generate new token (classic)"
3. Name your token in the Note: field "Urbalurba Infrastructure"
4. Expiration: Select "No expiration" (or preferably a suitable expiration date)
5. Select scopes: `repo` and `write:packages`
6. Click "Generate token" and copy it immediately (it will only be shown once)

For detailed instructions, see the [official GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic).

Keep the token secure and do not share it with anyone. It is used to authenticate your GitHub account and access your repositories.

---

## Setting Up for Local Development

### 1. Create GitHub Repository

- Create a new private repository in GitHub and clone it to your local machine.
- Just like any other GitHub repository, this is where the code will be stored and versioned.

### 2. Setup Developer Toolbox

The developer-toolbox is a set of tools for development of various applications. With this you can develop Python, JavaScript/TypeScript, C-sharp etc. It uses devcontainer so that everyone has the same setup, and the setup is the same on all platforms (macOS, Windows, Linux).
See [devcontainer-toolbox](https://github.com/helpers-no/devcontainer-toolbox) for more information.

- Run the script that sets up the developer-toolbox. It sets up devcontainer and installs all the tools needed for development.
- Start VS Code and push an initial commit to GitHub.
- This verifies that the basic Git setup is working properly.

### 3. Select Project Template

- Inside the devcontainer, run `dev-template`
- This allows you to select an appropriate template for your project type (e.g., `typescript-basic-webserver`, `python-basic-webserver`, etc.)
- The script sets up the project structure, Kubernetes manifests, and GitHub Actions workflows

### 4. Local Development Environment

- Run the project template locally to verify it works correctly.
- This ensures the development environment is properly configured.
- Iterate on the code and test it locally just like any other development setup.

### 5. Push App to GitHub / Test Environment

We use GitHub Actions to build and push the container image to the GitHub Container Registry. All this is automated and the developer does not need to worry about it.

- Push the code to GitHub
- This triggers the GitHub Actions workflow
- The workflow builds the container image and pushes it to the GitHub Container Registry
- Go to the GitHub Actions web page and verify the status of the build
- If you set up the gh CLI you can also check the status from the command line: `gh run list`

### 6. Deploy App to Test Environment

The test environment is the local Kubernetes cluster on the developer's machine.
To make the cluster automatically pull the built image from the GitHub Container Registry every time you push code updates to GitHub, register the application with ArgoCD.

This is done once for each project, from the host machine (not inside the devcontainer):

```bash
./uis argocd register <app-name> <github-repo-url>
```

For example:

```bash
./uis argocd register my-app https://github.com/username/my-repo
```

This registers the repository with ArgoCD, creates a namespace, and sets up routing so the app is accessible at `http://<app-name>.localhost`.

### 7. Test App in Local Cluster

After registration, the application is automatically accessible at `http://<app-name>.localhost` in your browser. The platform creates a Traefik IngressRoute that routes traffic to your application — no manual DNS setup needed.

### 8. Ongoing Development

The development workflow is now set up. Write and run code locally inside the devcontainer. Testing during development is done locally.

When you want to test how the code will run in a production-like environment, push the code to GitHub and ArgoCD will automatically deploy the application to the local Kubernetes cluster.

### 9. Sharing and Handover to Production

When a solution is ready for sharing or evaluation by central IT, the code is already in a structured, familiar format that follows best practices and GitOps workflow.

### 10. Set up GitHub CLI (Optional but Recommended)

Do this inside the devcontainer.

The GitHub CLI allows you to interact with GitHub from the command line. It is simpler to run a command instead of opening a web page to check a status.

Start authentication:

```bash
gh auth login
```

You will be prompted for several options:

```plaintext
? What account do you want to log into? GitHub.com
? What is your preferred protocol for Git operations? HTTPS
? Authenticate Git with your GitHub credentials? Yes
? How would you like to authenticate GitHub CLI? Login with a web browser

! First copy your one-time code: XXXX-XXXX
Press Enter to open github.com in your browser...
✓ Authentication complete.
- gh config set -h github.com git_protocol https
✓ Configured git protocol
✓ Logged in as yourusername
```

After authenticating, you can use CLI commands to manage your repositories:

```bash
gh repo list
```

See [GitHub CLI documentation](https://cli.github.com/manual/) for more information.

# TypeScript Basic Webserver

File: templates/typescript-basic-webserver/README-typescript-basic-webserver.md

A simple Express server written in TypeScript.
Purpose is to demonstrate how to develop a simple web server that can be deployed to your local Kubernetes using ArgoCD and GitHub Actions.
See the repo https://github.com/terchris/urbalurba-infrastructure for setting up local kubernetes and ArgoCD.

## Prerequisites

The devcontainer-toolbox sets up everything you need to run this project locally.
See the repo https://github.com/norwegianredcross/devcontainer-toolbox on how to set it up.
When you have the devcontainer-toolbox set up, you type the following command in your terminal:

```bash
.devcontainer/dev/dev-template.sh
```

Then you select this template from the list:

```plaintext
1. typescript-basic-webserver
````

## Getting started

Once you have installed the template you are ready to start developing.

Run the following commands to build and run the server locally:

```bash
npm install
npm run dev
```

You will see the following output:

```plaintext

added 125 packages, and audited 126 packages in 12s

18 packages are looking for funding
  run `npm fund` for details

3 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.

> typescript-basic-webserver@1.0.0 dev
> nodemon app/index.ts

[nodemon] 2.0.22
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: ts,json
[nodemon] starting `ts-node app/index.ts`
Server running at http://localhost:3000
```

This means the server is running and listening on port 3000. You can access it by navigating to `http://localhost:3000` in your web browser.
You will see the message "Hello World".

Change the message in `app/index.ts` to something else, save the file and see how the server restarts automatically and the message changes.

## Deploying to Kubernetes on your local machine

TODO: Add instructions for deploying to Kubernetes on your local machine.


## File structure

The file structure of the project is as follows:

```plaintext
templates/typescript-basic-webserver/
├── app/
│   └── index.ts                 # Express server with Hello World
├── Dockerfile                   # Container build for app
├── manifests/
│   ├── deployment.yaml          # K8s deployment + service
│   └── kustomization.yaml       # For ArgoCD compatibility
├── .dockerignore                # Ignore files for Docker build
├── .gitignore                  # Ignore files for Git
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # GitHub Actions CI
├── package.json
├── tsconfig.json
└── README-typescript-basic-webserver.md    # this file
```

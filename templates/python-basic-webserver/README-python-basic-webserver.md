# Python Basic Webserver

filename: templates/python-basic-webserver/README-python-basic-webserver.md

A simple Flask server written in Python.
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
1. python-basic-webserver
````

## Getting started

Once you have installed the template you are ready to start developing.

Run the following commands to build and run the server locally:

```bash
pip install -r requirements.txt
python app/app.py
```

You will see the following output:

```plaintext
Server running at http://localhost:6000
 * Serving Flask app 'app/app.py'
 * Debug mode: on
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:6000
 * Running on http://192.168.x.x:6000
 * Press CTRL+C to quit
 * Restarting with stat
```

This means the server is running and listening on port 6000. You can access it by navigating to `http://localhost:6000` in your web browser.
You will see the message "Hello World" with the current time and date.

Change the message in `app/app.py` to something else, save the file and see how the server restarts automatically and the message changes.

## Deploying to Kubernetes on your local machine

TODO: Add instructions for deploying to Kubernetes on your local machine.

## File structure

The file structure of the project is as follows:

```plaintext
templates/python-basic-webserver/
├── app/
│   └── app.py                  # Flask server with Hello World
├── Dockerfile                  # Container build for app
├── manifests/
│   ├── deployment.yaml         # K8s deployment + service
│   └── kustomization.yaml      # For ArgoCD compatibility
├── .dockerignore               # Ignore files for Docker build
├── .gitignore                 # Ignore files for Git
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # GitHub Actions CI
├── requirements.txt            # Python dependencies
└── README-python-basic-webserver.md    # this file
```
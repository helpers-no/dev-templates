# Designsystemet Basic React App

A React application using [Designsystemet](https://designsystemet.no/) from Digdir. Displays a blog page with cards using Designsystemet components, built with Vite and TypeScript.

## Quick Start

1. Update your terminal (tools were installed):
   ```bash
   source ~/.bashrc
   ```

2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open in browser: http://localhost:3000

The dev server auto-reloads on file changes via Vite.

## Prerequisites

Development tools are installed automatically by the devcontainer.
If you need to reinstall, run: `dev-setup`

## Project Structure

After installation, your project contains:

```plaintext
├── app/
│   ├── App.tsx                            # Main application component
│   ├── App.css                            # Application styles
│   ├── main.tsx                           # Entry point
│   ├── components/
│   │   └── BlogCard/
│   │       ├── BlogCard.tsx               # Blog card component
│   │       └── BlogCard.css
│   ├── data/
│   │   └── BlogPosts.json                 # Blog post data
│   └── types/
│       └── Blog.ts                        # TypeScript types
├── public/
│   └── images/                            # Blog post images
├── manifests/
│   ├── deployment.yaml                    # K8s Deployment + Service
│   └── kustomization.yaml                 # ArgoCD configuration
├── .github/
│   └── workflows/
│       └── urbalurba-build-and-push.yaml  # CI/CD pipeline
├── Dockerfile                             # Container build
├── index.html
├── package.json                           # Node.js dependencies
├── tsconfig.json                          # TypeScript configuration
├── vite.config.ts                         # Vite configuration
├── TEMPLATE_INFO                          # Template metadata
└── README-designsystemet-basic-react-app.md  # This file
```

## Development

- Edit `app/App.tsx` — the main application component
- Edit `app/data/BlogPosts.json` — add or modify blog posts
- Edit `app/components/BlogCard/BlogCard.tsx` — customise the card component
- Uses Designsystemet React components (Card, Heading, Paragraph)
- Changes auto-reload via Vite HMR

## Docker Build

```bash
docker build -t designsystemet-basic-react-app .
docker run -p 3000:3000 designsystemet-basic-react-app
```

## Kubernetes Deployment

```bash
kubectl apply -k manifests/
```

The app will be accessible at `http://<app-name>.localhost` after ArgoCD registration.

## CI/CD

The GitHub Actions workflow automatically builds and pushes the Docker image to GitHub Container Registry when changes are pushed to the main branch.

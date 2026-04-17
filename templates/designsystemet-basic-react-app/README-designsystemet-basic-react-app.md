# Designsystemet Basic React App — app notes

Full template documentation (install, prerequisites, file tree, tooling, architecture, Docker, Kubernetes, CI/CD) is published at:

**[https://tmp.sovereignsky.no/docs/templates/web-app/designsystemet-basic-react-app/](https://tmp.sovereignsky.no/docs/templates/web-app/designsystemet-basic-react-app/)**

The sections below describe the **React/Vite app** under **`src/`**.

## What it renders

- **`src/App.tsx`** — page shell: headings and a grid of blog cards.
- **`src/components/BlogCard/BlogCard.tsx`** — each post using Designsystemet **Card**, **Heading**, **Paragraph** (`@digdir/designsystemet-react`).
- **`src/data/blog-posts.json`** — post list consumed by `App` (shape matches **`src/types/BlogPost.ts`**).
- **`src/main.tsx`** — Vite/React entry; imports global CSS and themes.

Static assets for posts live under **`public/`** (paths referenced from the JSON).

## Dev server

- **Run:** `npm install` then `npm run dev` (Vite HMR on file changes).
- Default dev URL is shown in the terminal (typically **http://localhost:3000** unless the port is taken).

## Changing the app

- Edit copy and layout in **`App.tsx`**; adjust card styling in **`BlogCard.tsx`** / **`BlogCard.module.css`**.
- Add or edit posts in **`src/data/blog-posts.json`** and place images under **`public/`** as needed.

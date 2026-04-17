# Designsystemet Basic React App — app notes

The Designsystemet Basic React App template is a React app that demonstrates how to use the Norwegian government design system (Designsystemet) to build a styled web application.
The purpose of this app is to verify that the development environment is set up and to provide a starting point for apps that use the Designsystemet component library.
See more documentation at http://localhost:3000/docs/templates/web-app/designsystemet-basic-react-app

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

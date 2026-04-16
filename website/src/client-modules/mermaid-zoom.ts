/**
 * mermaid-zoom.ts — click-to-enlarge for rendered mermaid diagrams.
 *
 * Loaded via `clientModules` in `docusaurus.config.ts`, runs on every
 * page load and every SPA route update. Queries all mermaid containers
 * (`.docusaurus-mermaid-container` — stable class hardcoded in
 * `@docusaurus/theme-mermaid`), attaches a click handler + a cursor-
 * pointer style to each, and opens a native HTML `<dialog>` overlay
 * showing an enlarged copy of the diagram when clicked.
 *
 * Why a client module and not a theme swizzle: swizzling the Mermaid
 * theme component creates a maintenance burden on every Docusaurus
 * upgrade. A client module is a thin post-mount hook — it runs *after*
 * Docusaurus has rendered whatever it's going to render, and attaches
 * behavior without owning the rendering path.
 *
 * Ships as part of PLAN-architecture-diagram-display Phase 3b. The
 * upstream investigation spike proved that medium-zoom (the library
 * behind docusaurus-plugin-image-zoom) cannot zoom inline SVG — it
 * hard-rejects any non-<img> element. Native <dialog> is the fallback.
 *
 * Browser support: HTMLDialogElement is supported in all modern
 * evergreen browsers (Chrome 37+, Edge 79+, Firefox 98+, Safari 15.4+).
 * The site's browserslist targets are covered.
 */

// Docusaurus invokes this default export on every route update.
// We also run it once on initial mount via the module's top-level code,
// and we install a MutationObserver that catches mermaid containers
// created after mount — which matters because Docusaurus's swizzled
// <details> theme component only mounts its child content when the
// dropdown is first opened. Without the observer, a collapsed dropdown
// containing a mermaid diagram wouldn't get wired for zoom until the
// next route update.
export function onRouteUpdate({
  location: _location,
}: {
  location: Location;
}): (() => void) | void {
  // Wait for mermaid to render client-side. docusaurus-plugin-image-zoom
  // uses a 1s timeout for the same reason; we match that.
  const timeoutId = window.setTimeout(wireMermaidContainers, 1000);
  return () => window.clearTimeout(timeoutId);
}

// Initial mount — also fires on the first page load before onRouteUpdate
// kicks in. Guarded against SSR (no window). Installs the persistent
// MutationObserver on the same tick.
if (typeof window !== 'undefined') {
  window.setTimeout(wireMermaidContainers, 1000);
  installMutationObserver();
}

/**
 * Watch the DOM for new `.docusaurus-mermaid-container` elements added
 * after initial mount, and wire them up as soon as they appear. This
 * catches diagrams rendered inside lazy-mounted dropdowns.
 *
 * Installed once per page load; survives route updates because it
 * observes `document.body` which persists across Docusaurus SPA nav.
 */
function installMutationObserver(): void {
  if (typeof MutationObserver === 'undefined') return;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof HTMLElement)) continue;
        // Check the added node and its descendants for mermaid containers.
        // Using querySelectorAll on the node covers both cases — the
        // container itself being added or a wrapper whose children contain
        // the container.
        if (node.classList.contains(CONTAINER_CLASS)) {
          wireMermaidContainers();
          return;
        }
        if (node.querySelector?.(`.${CONTAINER_CLASS}`)) {
          wireMermaidContainers();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

const CONTAINER_CLASS = 'docusaurus-mermaid-container';
const WIRED_ATTR = 'data-mermaid-zoom-wired';
const DIALOG_ID = 'mermaid-zoom-dialog';

/**
 * Find every mermaid container on the page and attach a click handler
 * (idempotent — a container that's already wired is skipped).
 */
function wireMermaidContainers(): void {
  const containers = document.querySelectorAll<HTMLElement>(
    `.${CONTAINER_CLASS}:not([${WIRED_ATTR}])`,
  );
  containers.forEach((container) => {
    container.setAttribute(WIRED_ATTR, 'true');
    container.style.cursor = 'zoom-in';
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', 'Click to enlarge diagram');
    container.addEventListener('click', () => openZoomDialog(container));
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openZoomDialog(container);
      }
    });
  });
}

/**
 * Open the overlay with an enlarged copy of the container's SVG.
 * Reuses a single global <dialog> across clicks to avoid leaking
 * DOM nodes on every interaction.
 */
function openZoomDialog(container: HTMLElement): void {
  const svg = container.querySelector('svg');
  if (!svg) return;

  const dialog = getOrCreateDialog();
  const body = dialog.querySelector<HTMLElement>('[data-mermaid-zoom-body]');
  if (!body) return;

  // Replace the dialog's content with a fresh clone of the clicked SVG.
  body.innerHTML = '';
  const clone = svg.cloneNode(true) as SVGElement;
  // Strip any intrinsic size constraints on the clone so it can scale
  // to fill the dialog. Mermaid renders SVGs with explicit width/height
  // attributes; we want the viewBox to drive the display size instead.
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  clone.setAttribute('style', 'max-width: 100%; max-height: 100%; height: auto;');
  body.appendChild(clone);

  dialog.showModal();
}

/**
 * Lazy-create a single `<dialog>` element on first use; reuse across
 * subsequent clicks. The element lives at the end of `<body>` and is
 * styled inline to avoid a CSS file dependency for this one use.
 */
function getOrCreateDialog(): HTMLDialogElement {
  const existing = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
  if (existing) return existing;

  const dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.setAttribute('aria-label', 'Enlarged diagram');

  // Minimal inline styling. Keeps the component self-contained — no
  // CSS module import needed, survives Docusaurus theme swaps.
  // `backgroundColor` (not the `background` shorthand) uses an explicit
  // opaque color. The earlier `var(--ifm-background-color, #fff)` didn't
  // resolve cleanly under Docusaurus's theme, leaving the dialog
  // see-through — the fallback only kicks in when the variable is
  // undefined, not when it's defined-but-transparent. Dark-mode is
  // handled by a stylesheet override below.
  Object.assign(dialog.style, {
    width: 'min(96vw, 1400px)',
    height: 'min(92vh, 1000px)',
    maxWidth: '96vw',
    maxHeight: '92vh',
    padding: '0',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
  });

  // Close button in the top-right corner.
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close enlarged diagram');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '12px',
    width: '36px',
    height: '36px',
    fontSize: '24px',
    lineHeight: '1',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: 'var(--ifm-color-emphasis-800, #333)',
    zIndex: '1',
  });
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.appendChild(closeBtn);

  // Body wrapper — holds the cloned SVG, takes full dialog space.
  // Explicit backgroundColor here too as a belt-and-suspenders so the
  // mermaid SVG (which has a transparent canvas) never shows through
  // to the blurred page backdrop.
  const body = document.createElement('div');
  body.setAttribute('data-mermaid-zoom-body', '');
  Object.assign(body.style, {
    width: '100%',
    height: '100%',
    padding: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    backgroundColor: '#ffffff',
  });
  dialog.appendChild(body);

  // Click-outside-the-content closes the dialog. `<dialog>` already
  // handles Escape natively.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Style the native ::backdrop pseudo-element via a stylesheet rule.
  // Inline style doesn't cover pseudo-elements, so inject once.
  ensureBackdropStyle();

  document.body.appendChild(dialog);
  return dialog;
}

let backdropStyleInjected = false;

function ensureBackdropStyle(): void {
  if (backdropStyleInjected) return;
  backdropStyleInjected = true;
  const style = document.createElement('style');
  // Backdrop opacity bumped from 0.6 to 0.9 so the page behind the
  // dialog is effectively hidden. At 0.6 the page text still bled
  // through visibly; at 0.9 only a faint darkened silhouette remains.
  //
  // The [data-theme='dark'] rules override the inline light-mode
  // backgroundColor on the dialog + body so dark-mode readers don't
  // get a jarring white rectangle.
  style.textContent = `
    dialog#${DIALOG_ID}::backdrop {
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(3px);
    }
    [data-theme='dark'] dialog#${DIALOG_ID} {
      background-color: #1b1b1d !important;
    }
    [data-theme='dark'] dialog#${DIALOG_ID} [data-mermaid-zoom-body] {
      background-color: #1b1b1d !important;
    }
    .${CONTAINER_CLASS}:hover {
      outline: 2px solid var(--ifm-color-primary-light, #3578e5);
      outline-offset: 4px;
      border-radius: 4px;
    }
    .${CONTAINER_CLASS}:focus-visible {
      outline: 2px solid var(--ifm-color-primary, #3578e5);
      outline-offset: 4px;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
}

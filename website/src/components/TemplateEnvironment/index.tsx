import React from 'react';
import styles from './styles.module.css';

// ── Legacy prop types (kept during the rename, may be removed later) ─

interface RequiresEntry {
  service: string;
  config?: Record<string, unknown>;
}

interface QuickstartBlock {
  title: string;
  setup: string[];
  run: string;
  note?: string;
}

// ── New prop types for the Environment card ────────────────────────
//
// All of these are pre-resolved by `scripts/generate-registry.ts` and arrive
// as plain JSON props. The component is a dumb renderer — no lookups, no
// substitutions. See PLAN-environment-card.md "Where every displayed value
// comes from" for the full data lineage.

export interface ResolvedTool {
  /** Tool ID, e.g. "dev-python" */
  id: string;
  /** Display name from dct-tools.json, e.g. "Python Development Tools" */
  name: string;
  /** One-line description from dct-tools.json */
  description: string;
  /** Upstream project website, optional */
  website?: string;
  /** Pre-built DCT docs URL */
  docsUrl?: string;
}

export interface TransitiveDep {
  id: string;
  name: string;
  docsUrl?: string;
}

export interface ResolvedService {
  /** Service ID, e.g. "postgresql" */
  id: string;
  /** Display name from uis-services.json, e.g. "PostgreSQL" */
  name: string;
  /** One-line description from uis-services.json */
  description: string;
  /** Pre-built UIS docs URL */
  docsUrl?: string;
  /** Upstream project website (e.g. https://www.postgresql.org), optional */
  website?: string;
  /** Local port-forward port from uis-services.json `exposePort` */
  exposePort?: number;
  /** Cluster namespace from uis-services.json */
  namespace?: string;
  /** Helm chart from uis-services.json (display only, optional) */
  helmChart?: string;
  /** Resolved database name (with `{{ params.* }}` substituted) */
  database?: string;
  /** Display-only "generated user" derived from params.app_name */
  generatedUser?: string;
  /** Env var name read from manifests/deployment.yaml (app templates only) */
  envVar?: string;
  /** K8s secret name with `{{REPO_NAME}}` substituted (app templates only) */
  secretName?: string;
  /** Container port from manifests/deployment.yaml (app templates only) */
  containerPort?: number;
  /** Path to the init file (e.g. "config/init-database.sql"), if declared */
  initFilePath?: string;
  /** Transitive deps from uis-services.json `requires`, pre-resolved */
  transitiveRequires?: TransitiveDep[];
}

/**
 * Whether the template is an "app" (consumes services via `requires:`) or a
 * "stack" (provides services via `provides.services:`). Drives the header
 * label of the cluster section.
 */
export type TemplateKind = 'app' | 'stack';

interface TemplateEnvironmentProps {
  // Legacy props (still emitted by the generator for now — used as fallback)
  requires?: RequiresEntry[];
  params?: Record<string, string>;
  quickstart?: QuickstartBlock;

  // New props (Phase 2+3)
  tools?: ResolvedTool[];
  services?: ResolvedService[];
  templateKind?: TemplateKind;
  initFiles?: Record<string, string>;
  configureCommand?: string;
  templateInfoYaml?: string;
  expectedOutputBlock?: string;
}

// ── Sub-renderers ───────────────────────────────────────────────────

function ToolsBlock({tools}: {tools: ResolvedTool[]}) {
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>In your devcontainer</div>
      <ul className={styles.itemList}>
        {tools.map((t) => (
          <li key={t.id} className={styles.item}>
            <div className={styles.itemHeader}>
              {t.docsUrl ? (
                <a href={t.docsUrl} target="_blank" rel="noopener noreferrer">
                  {t.name}
                </a>
              ) : (
                t.name
              )}
              {t.website && (
                <a
                  href={t.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.external}
                  aria-label={`${t.name} upstream website`}
                >
                  ↗
                </a>
              )}
            </div>
            <div className={styles.itemDesc}>{t.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServicesBlock({
  services,
  templateKind,
}: {
  services: ResolvedService[];
  templateKind: TemplateKind;
}) {
  const heading =
    templateKind === 'stack' ? 'Provided to your cluster' : 'In your Kubernetes cluster';
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>{heading}</div>
      <ul className={styles.itemList}>
        {services.map((s) => (
          <li key={s.id} className={styles.item}>
            <div className={styles.itemHeader}>
              {s.docsUrl ? (
                <a href={s.docsUrl} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
              {s.website && (
                <a
                  href={s.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.external}
                  aria-label={`${s.name} upstream website`}
                >
                  ↗
                </a>
              )}
            </div>
            <div className={styles.itemDesc}>{s.description}</div>
            <ul className={styles.detailsList}>
              {s.database && (
                <li>
                  <span className={styles.detailsLabel}>Database</span>
                  <span className={styles.detailsValue}>{s.database}</span>
                </li>
              )}
              {s.generatedUser && (
                <li>
                  <span className={styles.detailsLabel}>User</span>
                  <span className={styles.detailsValue}>{s.generatedUser}</span>
                </li>
              )}
              {s.secretName && (
                <li>
                  <span className={styles.detailsLabel}>K8s Secret</span>
                  <span className={styles.detailsValue}>{s.secretName}</span>
                </li>
              )}
              {s.exposePort && (
                <li>
                  <span className={styles.detailsLabel}>Port-forward</span>
                  <span className={styles.detailsValue}>
                    host.docker.internal:{s.exposePort}
                  </span>
                </li>
              )}
              {s.envVar && (
                <li>
                  <span className={styles.detailsLabel}>Env var</span>
                  <span className={styles.detailsValue}>{s.envVar}</span>
                </li>
              )}
              {s.namespace && (
                <li>
                  <span className={styles.detailsLabel}>Namespace</span>
                  <span className={styles.detailsValue}>{s.namespace}</span>
                </li>
              )}
              {s.helmChart && (
                <li>
                  <span className={styles.detailsLabel}>Helm chart</span>
                  <span className={styles.detailsValue}>{s.helmChart}</span>
                </li>
              )}
            </ul>
            {s.transitiveRequires && s.transitiveRequires.length > 0 && (
              <div className={styles.transitive}>
                Also deploys:{' '}
                {s.transitiveRequires.map((d, i) => (
                  <React.Fragment key={d.id}>
                    {i > 0 && ', '}
                    {d.docsUrl ? (
                      <a href={d.docsUrl} target="_blank" rel="noopener noreferrer">
                        {d.name}
                      </a>
                    ) : (
                      d.name
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InitFilesBlock({initFiles}: {initFiles: Record<string, string>}) {
  const entries = Object.entries(initFiles);
  if (entries.length === 0) return null;
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionTitle}>Schema applied to the database</div>
      {entries.map(([path, content]) => (
        <details key={path} className="dropdownBlock">
          <summary>
            <code>{path}</code>
          </summary>
          <pre>
            <code>{content}</code>
          </pre>
        </details>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function TemplateEnvironment({
  requires,
  params,
  quickstart,
  tools,
  services,
  templateKind = 'app',
  initFiles,
  configureCommand,
  templateInfoYaml,
  expectedOutputBlock,
}: TemplateEnvironmentProps) {
  const hasTools = !!tools && tools.length > 0;
  const hasServices = !!services && services.length > 0;
  const hasInitFiles = !!initFiles && Object.keys(initFiles).length > 0;
  const hasWhatGetsSetUp = hasTools || hasServices || hasInitFiles;

  // Configure section: shown for app templates that consume services
  // (i.e. have requires:). Stack templates skip the configure section
  // because they install via uis template install, not dev-template configure.
  const showConfigure = !!requires && requires.length > 0;
  // Install section: shown for stack templates with an expected-output block.
  // Stacks don't have a Configure sub-section, so this is the rendering
  // location for their expected-output dropdown — parallel to Configure
  // on app templates, but simpler (no params list, no template-info.yaml
  // dropdown, just the install command + expected output).
  const showInstall = templateKind === 'stack' && !!expectedOutputBlock;
  const showRun = !!quickstart;

  // Numbering: ① ② ③ ④ across whichever sections are present.
  const setupVisible = showRun && (quickstart?.setup?.length ?? 0) > 0;
  const sectionsShown = [hasWhatGetsSetUp, showConfigure, showInstall, setupVisible, showRun].filter(Boolean).length;
  const showNumbers = sectionsShown > 1;
  let n = 0;
  const nextNumber = () => {
    if (!showNumbers) return null;
    n += 1;
    const symbols = ['①', '②', '③', '④'];
    return <span className={styles.number}>{symbols[n - 1]}</span>;
  };

  // Don't render the card at all if there's nothing to show.
  if (!hasWhatGetsSetUp && !showConfigure && !showRun) return null;

  // Param keys the user must fill in (those with empty default values)
  const paramKeys = params ? Object.keys(params).filter((k) => params[k] === '') : [];

  // Service-name list for the Configure paragraph. Prefer the resolved
  // services (which give nicer names like "PostgreSQL"); fall back to the
  // raw requires IDs.
  const configureServiceNames = hasServices
    ? services!.map((s) => s.name).join(', ')
    : requires?.map((r) => r.service).join(', ') ?? '';

  return (
    <div className="templateCard">
      <div className="templateCardEyebrow">ENVIRONMENT</div>

      {hasWhatGetsSetUp && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {nextNumber()}
            What gets set up
          </h3>
          <p className={styles.intro}>
            When you install this template, the following are configured for you:
          </p>
          {hasTools && <ToolsBlock tools={tools!} />}
          {hasServices && <ServicesBlock services={services!} templateKind={templateKind} />}
          {hasInitFiles && <InitFilesBlock initFiles={initFiles!} />}
        </div>
      )}

      {showConfigure && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {nextNumber()}
            Configure
          </h3>
          <p className={styles.intro}>
            Set up and configure the backend services this template needs.
            Creates a per-app database, wires credentials into a local{' '}
            <code>.env</code> file, and stores a Kubernetes Secret in your
            cluster for the deployed pod.
          </p>
          <p className={styles.text}>
            Uses: <strong>{configureServiceNames}</strong>
          </p>
          {paramKeys.length > 0 && (
            <>
              <p className={styles.text}>
                Edit <code>template-info.yaml</code> — set these params:
              </p>
              <ul className={styles.params}>
                {paramKeys.map((key) => (
                  <li key={key}>
                    <code>params.{key}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
          {templateInfoYaml && (
            <details className="dropdownBlock">
              <summary>
                <code>template-info.yaml</code> — edit to change defaults
              </summary>
              <pre>
                <code>{templateInfoYaml}</code>
              </pre>
            </details>
          )}
          <p className={styles.text}>Then run:</p>
          <pre className={styles.commands}>
            <code>{configureCommand ?? 'dev-template configure'}</code>
          </pre>
          {expectedOutputBlock && (
            <details className="dropdownBlock">
              <summary>
                Expected output from <code>{configureCommand ?? 'dev-template configure'}</code>
              </summary>
              <pre>
                <code>{expectedOutputBlock}</code>
              </pre>
            </details>
          )}
        </div>
      )}

      {showInstall && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {nextNumber()}
            Install
          </h3>
          <p className={styles.intro}>
            Install this stack into your local UIS environment.
            Provisions the services defined above and seeds them with any
            init data.
          </p>
          <p className={styles.text}>Then run:</p>
          <pre className={styles.commands}>
            <code>{configureCommand ?? 'uis template install'}</code>
          </pre>
          <details className="dropdownBlock">
            <summary>
              Expected output from <code>{configureCommand ?? 'uis template install'}</code>
            </summary>
            <pre>
              <code>{expectedOutputBlock}</code>
            </pre>
          </details>
        </div>
      )}

      {showRun && quickstart && quickstart.setup.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {nextNumber()}
            Setup
          </h3>
          <pre className={styles.commands}>
            <code>{quickstart.setup.join('\n')}</code>
          </pre>
        </div>
      )}

      {showRun && quickstart && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {nextNumber()}
            {quickstart.title}
          </h3>
          <pre className={styles.commands}>
            <code>{quickstart.run}</code>
          </pre>
          {quickstart.note && <p className={styles.note}>{quickstart.note}</p>}
        </div>
      )}
    </div>
  );
}

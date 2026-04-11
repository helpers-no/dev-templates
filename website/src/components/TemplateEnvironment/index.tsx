import React from 'react';
import styles from './styles.module.css';

// ── Existing prop types (unchanged from TemplateGetStarted) ─────────

interface RequiresEntry {
  service: string;
  config?: Record<string, unknown>;
}

interface QuickstartBlock {
  title: string;
  commands: string[];
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
  /** Pre-built DCT docs URL (e.g. https://dct.sovereignsky.no/docs/tools/development-tools/python) */
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
  /** Pre-built UIS docs URL (e.g. https://uis.sovereignsky.no/docs/services/databases/postgresql) */
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
  // Existing props (kept during the rename — Phase 2 will rewire to the new ones)
  requires?: RequiresEntry[];
  params?: Record<string, string>;
  quickstart?: QuickstartBlock;

  // New props (Phase 1: accepted but not yet rendered; Phase 2 wires them up)
  tools?: ResolvedTool[];
  services?: ResolvedService[];
  templateKind?: TemplateKind;
  initFiles?: Record<string, string>;
}

export default function TemplateEnvironment({
  requires,
  params,
  quickstart,
  tools: _tools,
  services: _services,
  templateKind: _templateKind,
  initFiles: _initFiles,
}: TemplateEnvironmentProps) {
  // Phase 1 stub: render the existing two-section card unchanged.
  // Phase 2 will add the "What gets set up" section above Configure
  // and rewire `requires` -> `services` for the cluster block.

  // Don't render anything if neither configure nor run applies
  if (!requires?.length && !quickstart) return null;

  const showConfigure = !!requires && requires.length > 0;
  const showRun = !!quickstart;
  const showNumbers = showConfigure && showRun;

  // Param keys the user must fill in (those with empty default values)
  const paramKeys = params ? Object.keys(params).filter((k) => params[k] === '') : [];

  // Service names from requires
  const services = requires?.map((r) => r.service).join(', ') ?? '';

  return (
    <div className={styles.card}>
      <div className={styles.eyebrow}>ENVIRONMENT</div>

      {showConfigure && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {showNumbers && <span className={styles.number}>①</span>}
            Configure
          </h3>
          <p className={styles.text}>
            This template uses <strong>{services}</strong>.
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
          <p className={styles.text}>Then run:</p>
          <pre className={styles.commands}>
            <code>dev-template-configure</code>
          </pre>
        </div>
      )}

      {showRun && quickstart && (
        <div className={styles.section}>
          <h3 className={styles.title}>
            {showNumbers && <span className={styles.number}>②</span>}
            {quickstart.title}
          </h3>
          <pre className={styles.commands}>
            <code>{quickstart.commands.join('\n')}</code>
          </pre>
          {quickstart.note && <p className={styles.note}>{quickstart.note}</p>}
        </div>
      )}
    </div>
  );
}

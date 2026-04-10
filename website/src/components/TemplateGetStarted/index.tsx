import React from 'react';
import styles from './styles.module.css';

interface RequiresEntry {
  service: string;
  config?: Record<string, unknown>;
}

interface QuickstartBlock {
  title: string;
  commands: string[];
  note?: string;
}

interface TemplateGetStartedProps {
  requires?: RequiresEntry[];
  params?: Record<string, string>;
  quickstart?: QuickstartBlock;
}

export default function TemplateGetStarted({
  requires,
  params,
  quickstart,
}: TemplateGetStartedProps) {
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
      <div className={styles.eyebrow}>GET STARTED</div>

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

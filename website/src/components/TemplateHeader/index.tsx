import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

interface TemplateHeaderProps {
  logo: string;
  name: string;
  version: string;
  description: string;
  install: string;
  website: string;
  docs: string;
  tags: string[];
  tools?: string;
}

export default function TemplateHeader({
  logo,
  name,
  version,
  description,
  install,
  website,
  docs,
  tags,
  tools,
}: TemplateHeaderProps) {
  const logoUrl = useBaseUrl(logo);

  return (
    <div className={styles.header}>
      <img src={logoUrl} alt={`${name} logo`} className={styles.logo} loading="lazy" />
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <span className={styles.name}>{name}</span>
          <span className={styles.version}>v{version}</span>
        </div>
        <p className={styles.description}>{description}</p>
        {tools && (
          <div className={styles.tools}>
            <span className={styles.toolsLabel}>Tools: </span>{tools}
          </div>
        )}
        <div className={styles.install}>
          <span className={styles.installLabel}>Install:</span>
          {install}
        </div>
        <div className={styles.links}>
          <a href={website} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Website ↗
          </a>
          <a href={docs} target="_blank" rel="noopener noreferrer" className={styles.link}>
            Docs ↗
          </a>
        </div>
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

interface LinkEntry {
  url: string;
  title?: string;
  icon?: string;
  type?: string;
}

interface TemplateHeaderProps {
  logo: string;
  name: string;
  version: string;
  description: string;
  abstract?: string;
  install: string;
  links?: LinkEntry[];
  maintainers?: string[];
  tags: string[];
  tools?: string;
}

export default function TemplateHeader({
  logo,
  name,
  version,
  description,
  abstract,
  install,
  links,
  maintainers,
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
        {abstract && <p className={styles.abstract}>{abstract}</p>}
        {tools && (
          <div className={styles.tools}>
            <span className={styles.toolsLabel}>Tools: </span>{tools}
          </div>
        )}
        <div className={styles.install}>
          <span className={styles.installLabel}>Install:</span>
          {install}
        </div>
        {links && links.length > 0 && (
          <div className={styles.links}>
            {links.map((link, idx) => (
              <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {link.title || link.url} ↗
              </a>
            ))}
          </div>
        )}
        {maintainers && maintainers.length > 0 && (
          <div className={styles.maintainers}>
            <span className={styles.maintainersLabel}>Maintainers: </span>
            {maintainers.map((user) => (
              <a key={user} href={`https://github.com/${user}`} target="_blank" rel="noopener noreferrer" className={styles.maintainer}>
                <img src={`https://github.com/${user}.png?size=24`} alt={user} className={styles.avatar} loading="lazy" />
                {user}
              </a>
            ))}
          </div>
        )}
        <div className={styles.tags}>
          {tags.map((tag) => (
            <a key={tag} href={`/docs/tags/${tag}`} className={styles.tag}>{tag}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

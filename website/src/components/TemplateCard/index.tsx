import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {Template} from '../../types/template';
import {getTemplatePath} from '../../utils/paths';
import styles from './styles.module.css';

interface TemplateCardProps {
  template: Template;
  showTags?: boolean;
}

export default function TemplateCard({template, showTags = true}: TemplateCardProps) {
  const logoUrl = useBaseUrl(`/img/templates/${template.logo}`);
  const detailUrl = getTemplatePath(template);
  const displayTags = showTags ? template.tags.slice(0, 3) : [];

  return (
    <div className={styles.card}>
      <img
        src={logoUrl}
        alt={`${template.name} logo`}
        className={styles.logo}
        loading="lazy"
      />
      <div className={styles.content}>
        <a href={detailUrl} className={styles.title}>
          {template.name}
        </a>
        <p className={styles.abstract}>{template.abstract}</p>
        {displayTags.length > 0 && (
          <div className={styles.tags}>
            {displayTags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import TemplateCard from '../TemplateCard';
import {getTemplatesByCategory} from '../../utils/data';
import styles from './styles.module.css';

interface TemplateListProps {
  categoryId: string;
}

export default function TemplateList({categoryId}: TemplateListProps) {
  const templates = getTemplatesByCategory(categoryId);

  if (templates.length === 0) {
    return <p>No templates in this category yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}

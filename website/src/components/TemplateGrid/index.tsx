import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import TemplateCard from '../TemplateCard';
import {getCategories, getTemplatesByCategory, getTemplateCountByCategory} from '../../utils/data';
import {getCategoryAnchor} from '../../utils/paths';
import styles from './styles.module.css';

export default function TemplateGrid() {
  const categories = getCategories();

  return (
    <div>
      {categories.map((category) => {
        const templates = getTemplatesByCategory(category.id);
        if (templates.length === 0) return null;

        const count = getTemplateCountByCategory(category.id);
        const logoUrl = useBaseUrl(`/img/categories/${category.logo}`);
        const anchor = getCategoryAnchor(category);

        return (
          <div key={category.id} id={anchor} className={styles.section}>
            <div className={styles.categoryHeader}>
              <img
                src={logoUrl}
                alt={`${category.name} logo`}
                className={styles.categoryLogo}
                loading="lazy"
              />
              <h2 className={styles.categoryName}>{category.name}</h2>
              <span className={styles.categoryCount}>
                {count} {count === 1 ? 'template' : 'templates'}
              </span>
            </div>
            <div className={styles.grid}>
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

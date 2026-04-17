import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {Category} from '../../types/category';
import {getCategoryAnchor, getCategoryFolder} from '../../utils/paths';
import styles from './styles.module.css';

interface CategoryCardProps {
  category: Category;
  templateCount: number;
  linkTo?: 'anchor' | 'docs';
}

export default function CategoryCard({category, templateCount, linkTo = 'anchor'}: CategoryCardProps) {
  const logoUrl = useBaseUrl(`/img/categories/${category.logo}`);
  const href = linkTo === 'docs'
    ? `/docs/templates/${getCategoryFolder(category)}/`
    : `#${getCategoryAnchor(category)}`;

  return (
    <a href={href} className={styles.card}>
      <img
        src={logoUrl}
        alt={`${category.name} logo`}
        className={styles.logo}
        loading="lazy"
      />
      <div className={styles.content}>
        <h3 className={styles.title}>{category.name}</h3>
        <p className={styles.description}>{category.description}</p>
        <span className={styles.count}>
          {templateCount} {templateCount === 1 ? 'template' : 'templates'}
        </span>
      </div>
    </a>
  );
}

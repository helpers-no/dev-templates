import React from 'react';
import CategoryCard from '../CategoryCard';
import {getCategories, getTemplateCountByCategory} from '../../utils/data';
import styles from './styles.module.css';

interface CategoryGridProps {
  excludeEmpty?: boolean;
  linkTo?: 'anchor' | 'docs';
}

export default function CategoryGrid({excludeEmpty = true, linkTo = 'anchor'}: CategoryGridProps) {
  const categories = getCategories();

  return (
    <div className={styles.grid}>
      {categories.map((category) => {
        const count = getTemplateCountByCategory(category.id);
        if (excludeEmpty && count === 0) return null;

        return (
          <CategoryCard
            key={category.id}
            category={category}
            templateCount={count}
            linkTo={linkTo}
          />
        );
      })}
    </div>
  );
}

import React from 'react';
import TemplateCard from './TemplateCard';
import categoriesData from '../data/categories.json';
import templatesData from '../data/templates.json';

export default function TemplateGrid() {
  const { categories } = categoriesData;
  const { templates } = templatesData;

  return (
    <div>
      {categories.map((category) => {
        const categoryTemplates = templates.filter(
          (t) => t.category === category.id
        );
        if (categoryTemplates.length === 0) return null;

        return (
          <div key={category.id} style={{ marginBottom: '2rem' }}>
            <h2>{category.name}</h2>
            <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>
              {category.description}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
              }}
            >
              {categoryTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

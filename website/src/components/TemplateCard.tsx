import React from 'react';

interface Template {
  id: string;
  version: string;
  type: string;
  name: string;
  description: string;
  category: string;
  abstract: string;
  tools: string;
  readme: string;
  tags: string[];
  logo: string;
  website: string;
  docs: string;
  summary: string;
  related: string[];
}

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const categoryDir = template.category.toLowerCase().replace(/_/g, '-');
  const detailUrl = `/docs/templates/${categoryDir}/${template.id}`;

  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '1.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <img
          src={`/img/templates/${template.logo}`}
          alt={`${template.name} logo`}
          width={48}
          height={48}
          style={{ borderRadius: '8px' }}
        />
        <div>
          <a href={detailUrl} style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {template.name}
          </a>
          <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)' }}>
            v{template.version}
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)' }}>
        {template.description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {template.tags.map((tag) => (
          <span
            key={tag}
            style={{
              background: 'var(--ifm-color-emphasis-200)',
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              fontSize: '0.75rem',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem', marginTop: 'auto' }}>
        <a href={template.website} target="_blank" rel="noopener noreferrer">Website</a>
        <a href={template.docs} target="_blank" rel="noopener noreferrer">Docs</a>
      </div>
    </div>
  );
}

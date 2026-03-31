import type {Template} from '../types/template';
import type {Category} from '../types/category';

export function getCategoryFolder(category: Category | string): string {
  const id = typeof category === 'string' ? category : category.id;
  return id.toLowerCase().replace(/_/g, '-');
}

export function getTemplatePath(template: Template): string {
  const catFolder = getCategoryFolder(template.category);
  return `/docs/templates/${catFolder}/${template.id}`;
}

export function getCategoryAnchor(category: Category | string): string {
  const id = typeof category === 'string' ? category : category.id;
  return id.toLowerCase().replace(/_/g, '-');
}

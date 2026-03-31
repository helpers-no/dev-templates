import type {Template} from '../types/template';
import type {Category} from '../types/category';
import templatesData from '../data/templates.json';
import categoriesData from '../data/categories.json';

export function getTemplates(): Template[] {
  return templatesData.templates as Template[];
}

export function getCategories(): Category[] {
  return (categoriesData.categories as Category[]).sort((a, b) => a.order - b.order);
}

export function getTemplatesByCategory(categoryId: string): Template[] {
  return getTemplates().filter((t) => t.category === categoryId);
}

export function getTemplateById(templateId: string): Template | undefined {
  return getTemplates().find((t) => t.id === templateId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return getCategories().find((c) => c.id === categoryId);
}

export function getTemplateCountByCategory(categoryId: string): number {
  return getTemplatesByCategory(categoryId).length;
}

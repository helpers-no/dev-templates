import type {Template} from '../types/template';
import type {Category} from '../types/category';
import registryData from '../data/template-registry.json';

export function getTemplates(): Template[] {
  return registryData.templates as Template[];
}

export function getCategories(): Category[] {
  return (registryData.categories as Category[]).sort((a, b) => a.order - b.order);
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

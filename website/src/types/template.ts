export interface Template {
  id: string;
  version: string;
  type: 'app' | 'ai';
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

export interface Template {
  id: string;
  folder: string;
  version: string;
  name: string;
  description: string;
  category: string;
  install_type: 'app' | 'overlay' | 'stack';
  abstract: string;
  tools: string;
  readme: string;
  tags: string[];
  logo: string;
  website: string;
  docs: string;
  summary: string;
  related: string[];
  context: string;
}

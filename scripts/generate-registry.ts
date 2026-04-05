/**
 * generate-registry.ts — Generate template-registry.json from YAML source files
 *
 * Scans all template-categories.yaml and template-info.yaml files,
 * validates them, and outputs website/src/data/template-registry.json.
 *
 * Usage: npx tsx scripts/generate-registry.ts
 *   (run from repo root, uses js-yaml from website/node_modules)
 */

import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from 'fs';
import {join, dirname, basename} from 'path';
import {createRequire} from 'module';

// Load js-yaml from website/node_modules
const ROOT = dirname(dirname(new URL(import.meta.url).pathname));
const require = createRequire(join(ROOT, 'website/package.json'));
const yaml = require('js-yaml') as {load: (str: string) => unknown};

const OUTPUT_PATH = join(ROOT, 'website/src/data/template-registry.json');

// --- Types ---

interface CategoryYaml {
  context: string;
  name: string;
  description: string;
  order: number;
  emoji: string;
  categories: Array<{
    id: string;
    order: number;
    name: string;
    description: string;
    tags: string;
    logo: string;
    emoji: string;
  }>;
}

interface TemplateInfoYaml {
  id: string;
  version: string;
  name: string;
  description: string;
  category: string;
  install_type: string;
  abstract: string;
  tools: string;
  readme: string;
  tags: string[];
  logo: string;
  website: string;
  docs: string;
  summary: string;
  related: string[];
  params?: Record<string, string>;
  requires?: Array<Record<string, unknown>>;
  provides?: unknown;
}

// --- Scanning ---

function findCategoryFiles(): string[] {
  const dirs = readdirSync(ROOT).filter((d) => {
    const path = join(ROOT, d);
    return (
      statSync(path).isDirectory() &&
      !d.startsWith('.') &&
      !['scripts', 'website', 'node_modules'].includes(d) &&
      existsSync(join(path, 'template-categories.yaml'))
    );
  });
  return dirs.map((d) => join(ROOT, d, 'template-categories.yaml'));
}

function findTemplateInfoFiles(folderPath: string): string[] {
  const entries = readdirSync(folderPath).filter((d) => {
    const path = join(folderPath, d);
    return (
      statSync(path).isDirectory() &&
      existsSync(join(path, 'template-info.yaml'))
    );
  });
  return entries.map((d) => join(folderPath, d, 'template-info.yaml'));
}

// --- Validation ---

const errors: string[] = [];

function fail(msg: string): void {
  errors.push(msg);
  console.error(`ERROR: ${msg}`);
}

function validateCategory(cat: CategoryYaml, file: string): void {
  if (!cat.context || !['dct', 'uis'].includes(cat.context)) {
    fail(`${file}: context must be 'dct' or 'uis', got '${cat.context}'`);
  }
  if (!cat.name) fail(`${file}: missing folder name`);
  if (typeof cat.order !== 'number') fail(`${file}: missing folder order`);
  if (!Array.isArray(cat.categories) || cat.categories.length === 0) {
    fail(`${file}: must have at least one category`);
  }
  for (const c of cat.categories || []) {
    if (!c.id) fail(`${file}: category missing id`);
    if (!c.name) fail(`${file}: category ${c.id} missing name`);
    if (typeof c.order !== 'number') fail(`${file}: category ${c.id} missing order`);
  }
}

function validateTemplate(
  tmpl: TemplateInfoYaml,
  file: string,
  dirName: string,
  validCategories: Set<string>,
): void {
  if (!tmpl.id) fail(`${file}: missing id`);
  if (tmpl.id !== dirName) {
    fail(`${file}: id '${tmpl.id}' does not match directory name '${dirName}'`);
  }
  if (!tmpl.version) fail(`${file}: missing version`);
  if (!tmpl.name) fail(`${file}: missing name`);
  if (!tmpl.description) fail(`${file}: missing description`);
  if (!tmpl.category) fail(`${file}: missing category`);
  if (!validCategories.has(tmpl.category)) {
    fail(`${file}: category '${tmpl.category}' not defined in any template-categories.yaml`);
  }
  if (!tmpl.install_type || !['app', 'overlay', 'stack'].includes(tmpl.install_type)) {
    fail(`${file}: install_type must be 'app', 'overlay', or 'stack', got '${tmpl.install_type}'`);
  }
  if (!tmpl.abstract) fail(`${file}: missing abstract`);
  if (!tmpl.readme) fail(`${file}: missing readme`);
  if (!Array.isArray(tmpl.tags)) fail(`${file}: tags must be a list`);
  if (!tmpl.logo) fail(`${file}: missing logo`);
  if (!tmpl.docs) fail(`${file}: missing docs`);
  if (!tmpl.summary) fail(`${file}: missing summary`);
}

// --- Main ---

console.log('Scanning for template-categories.yaml files...');
const categoryFiles = findCategoryFiles();

if (categoryFiles.length === 0) {
  console.error('ERROR: No template-categories.yaml files found');
  process.exit(1);
}

// Parse all category files
const allCategories: Array<{
  id: string;
  order: number;
  name: string;
  description: string;
  tags: string;
  logo: string;
  emoji: string;
  context: string;
}> = [];
const categoryIdSet = new Set<string>();
const folderContextMap = new Map<string, string>(); // folder path → context

for (const file of categoryFiles) {
  const folderPath = dirname(file);
  const folderName = basename(folderPath);
  console.log(`  ${folderName}/template-categories.yaml`);

  const raw = yaml.load(readFileSync(file, 'utf8')) as CategoryYaml;
  validateCategory(raw, file);

  folderContextMap.set(folderPath, raw.context);

  for (const cat of raw.categories || []) {
    if (categoryIdSet.has(cat.id)) {
      fail(`Duplicate category ID '${cat.id}' in ${file}`);
    }
    categoryIdSet.add(cat.id);
    allCategories.push({...cat, context: raw.context});
  }
}

// Sort categories by order
allCategories.sort((a, b) => a.order - b.order);

// Parse all template-info files
console.log('\nScanning for template-info.yaml files...');
const allTemplates: Array<Record<string, unknown>> = [];

for (const catFile of categoryFiles) {
  const folderPath = dirname(catFile);
  const folderName = basename(folderPath);
  const context = folderContextMap.get(folderPath)!;
  const infoFiles = findTemplateInfoFiles(folderPath);

  for (const file of infoFiles) {
    const dirName = basename(dirname(file));
    console.log(`  ${folderName}/${dirName}/template-info.yaml`);

    const raw = yaml.load(readFileSync(file, 'utf8')) as TemplateInfoYaml;
    validateTemplate(raw, file, dirName, categoryIdSet);

    const entry: Record<string, unknown> = {
      id: raw.id,
      folder: `${folderName}/${dirName}`,
      version: raw.version,
      name: raw.name,
      description: raw.description,
      category: raw.category,
      install_type: raw.install_type,
      abstract: raw.abstract?.trim(),
      tools: raw.tools || '',
      readme: raw.readme,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      logo: raw.logo,
      website: raw.website || '',
      docs: raw.docs,
      summary: raw.summary?.trim(),
      related: Array.isArray(raw.related) ? raw.related : [],
      context,
    };

    // Optional fields — only include if present
    if (raw.params) entry.params = raw.params;
    if (raw.requires) entry.requires = raw.requires;
    if (raw.provides) entry.provides = raw.provides;

    allTemplates.push(entry);
  }
}

// Check for errors
if (errors.length > 0) {
  console.error(`\n${errors.length} validation error(s) found. Aborting.`);
  process.exit(1);
}

// Write output
const registry = {
  generated: new Date().toISOString(),
  categories: allCategories,
  templates: allTemplates,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2) + '\n');
console.log(`\nGenerated ${OUTPUT_PATH}`);
console.log(`  ${allCategories.length} categories, ${allTemplates.length} templates`);

/**
 * generate-registry.ts — Generate template-registry.json from YAML source files
 *
 * Scans all template-categories.yaml and template-info.yaml files,
 * validates them, and outputs website/src/data/template-registry.json.
 *
 * For the Environment card (PLAN-environment-card.md), this script also:
 *  - Resolves each template's `tools:` IDs against the vendored DCT tools.json
 *    (rich descriptions + DCT doc URLs).
 *  - Resolves each template's `requires:` (app) or `provides.services:` (stack)
 *    against the vendored UIS services.json (rich descriptions + UIS doc URLs
 *    + port-forward + namespace + transitive deps).
 *  - For app templates, parses `manifests/deployment.yaml` to extract the env
 *    var name, K8s secret name pattern, and container port. These are values
 *    the contributor already wrote in the manifest; we read them so the
 *    Environment card can show them above the fold.
 *  - Reads init SQL files referenced via `requires[].config.init` /
 *    `provides.services[].config.init` and embeds the contents on the
 *    registry entry so the website can show them in a collapsible block.
 *
 * The bash script generate-docs-markdown.sh consumes the resolved fields with
 * jq and emits MDX. The React component is a dumb renderer.
 *
 * Usage: npx tsx scripts/generate-registry.ts
 *   (run from repo root, uses js-yaml from website/node_modules)
 */

import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from 'fs';
import {join, dirname, basename} from 'path';
import {createRequire} from 'module';

import {
  DCT_DOCS_BASE,
  UIS_DOCS_BASE,
  buildDctToolDocsUrl,
  buildUisDocsUrl,
} from './lib/dct-doc-paths.js';
import {buildArchitectureMdx, type TemplateEntry as ArchitectureTemplateEntry} from './lib/build-architecture-mermaid.js';

// Load js-yaml from website/node_modules
const ROOT = dirname(dirname(new URL(import.meta.url).pathname));
const require = createRequire(join(ROOT, 'website/package.json'));
const yaml = require('js-yaml') as {
  load: (str: string) => unknown;
  loadAll: (str: string) => unknown[];
};

const OUTPUT_PATH = join(ROOT, 'website/src/data/template-registry.json');
const DCT_TOOLS_PATH = join(ROOT, 'website/src/data/dct-tools.json');
const UIS_SERVICES_PATH = join(ROOT, 'website/src/data/uis-services.json');

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
  maintainers?: string[];
  links?: Array<{url: string; title?: string; icon?: string; type?: string}>;
  prerequisites?: Array<{text: string; url?: string}>;
  related: string[];
  params?: Record<string, string>;
  requires?: Array<{
    service: string;
    config?: Record<string, unknown>;
  }>;
  provides?: {
    services?: Array<{
      service: string;
      config?: Record<string, unknown>;
    }>;
  };
  quickstart?: {
    title: string;
    setup: string[];
    run: string;
    note?: string;
  };
  configure_command?: string;
}

interface DctTool {
  id: string;
  name: string;
  description: string;
  category: string;
  website?: string;
}

interface DctToolsFile {
  version: string;
  generated: string;
  tools: DctTool[];
}

interface UisService {
  id: string;
  name: string;
  description: string;
  exposePort?: number;
  namespace?: string;
  helmChart?: string;
  docs?: string;
  website?: string;
  requires?: string[];
}

interface UisServicesFile {
  services: UisService[];
}

interface ResolvedTool {
  id: string;
  name: string;
  description: string;
  website?: string;
  docsUrl?: string;
}

interface TransitiveDep {
  id: string;
  name: string;
  docsUrl?: string;
}

interface ResolvedService {
  id: string;
  name: string;
  description: string;
  docsUrl?: string;
  website?: string;
  exposePort?: number;
  namespace?: string;
  helmChart?: string;
  database?: string;
  generatedUser?: string;
  envVar?: string;
  secretName?: string;
  containerPort?: number;
  initFilePath?: string;
  transitiveRequires?: TransitiveDep[];
}

type TemplateKind = 'app' | 'stack';

interface DeploymentManifestExtract {
  envVar?: string;
  secretName?: string;
  containerPort?: number;
}

// --- Vendored data loading ---

function loadDctTools(): Map<string, DctTool> {
  const raw = JSON.parse(readFileSync(DCT_TOOLS_PATH, 'utf8')) as DctToolsFile;
  const map = new Map<string, DctTool>();
  for (const t of raw.tools) map.set(t.id, t);
  return map;
}

function loadUisServices(): Map<string, UisService> {
  const raw = JSON.parse(readFileSync(UIS_SERVICES_PATH, 'utf8')) as UisServicesFile;
  const map = new Map<string, UisService>();
  for (const s of raw.services) map.set(s.id, s);
  return map;
}

// --- Resolvers ---

const warnings: string[] = [];

function warn(msg: string): void {
  warnings.push(msg);
  console.warn(`⚠ ${msg}`);
}

/**
 * Substitute `{{ params.X }}` references in a string with their default values
 * from the template's params block. Unknown references are left as-is and
 * trigger a warning.
 */
function substituteParams(
  input: string,
  params: Record<string, string> | undefined,
  context: string,
): string {
  if (!params) return input;
  return input.replace(/\{\{\s*params\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in params) return params[key];
    warn(`${context}: unresolved {{ params.${key} }} in '${input}'`);
    return match;
  });
}

/**
 * Substitute `{{REPO_NAME}}` with `params.app_name` for display purposes.
 * At install time DCT replaces this with the user's actual git repo name; for
 * the website preview we use app_name as the closest sensible default.
 */
function substituteRepoName(
  input: string,
  params: Record<string, string> | undefined,
): string {
  const appName = params?.app_name ?? '';
  return input.replace(/\{\{\s*REPO_NAME\s*\}\}/g, appName);
}

function resolveTools(
  toolsField: string,
  dctTools: Map<string, DctTool>,
  templateId: string,
): ResolvedTool[] {
  if (!toolsField || typeof toolsField !== 'string') return [];
  // The `tools:` field is a whitespace-separated string of IDs (e.g. "dev-python")
  const ids = toolsField.split(/\s+/).filter((s) => s.length > 0);
  const resolved: ResolvedTool[] = [];
  for (const id of ids) {
    const t = dctTools.get(id);
    if (!t) {
      warn(`${templateId}: unknown tool '${id}' (not in dct-tools.json)`);
      // Render as a bare entry so the user still sees something
      resolved.push({id, name: id, description: ''});
      continue;
    }
    const docsUrl = buildDctToolDocsUrl(t.id, t.category);
    if (!docsUrl) {
      warn(`${templateId}: tool '${id}' has unknown category '${t.category}' — no docs link`);
    }
    resolved.push({
      id: t.id,
      name: t.name,
      description: t.description,
      website: t.website,
      docsUrl: docsUrl ?? undefined,
    });
  }
  return resolved;
}

function resolveTransitiveDeps(
  ids: string[] | undefined,
  uisServices: Map<string, UisService>,
): TransitiveDep[] {
  if (!ids || ids.length === 0) return [];
  return ids
    .map((id): TransitiveDep | null => {
      const s = uisServices.get(id);
      if (!s) return {id, name: id};
      return {
        id: s.id,
        name: s.name,
        docsUrl: buildUisDocsUrl(s.docs) ?? undefined,
      };
    })
    .filter((x): x is TransitiveDep => x !== null);
}

/**
 * Generate the display-only "user" name for a service. UIS convention is to
 * derive it from the app name (lowercased, hyphens -> underscores).
 */
function deriveGeneratedUser(appName: string | undefined): string | undefined {
  if (!appName) return undefined;
  return appName.toLowerCase().replace(/-/g, '_');
}

function resolveServices(
  serviceEntries: Array<{service: string; config?: Record<string, unknown>}> | undefined,
  uisServices: Map<string, UisService>,
  params: Record<string, string> | undefined,
  manifest: DeploymentManifestExtract | undefined,
  templateKind: TemplateKind,
  templateId: string,
): ResolvedService[] {
  if (!serviceEntries || serviceEntries.length === 0) return [];
  const generatedUser = deriveGeneratedUser(params?.app_name);

  return serviceEntries.map((entry, idx) => {
    const s = uisServices.get(entry.service);
    if (!s) {
      warn(`${templateId}: unknown service '${entry.service}' (not in uis-services.json)`);
      return {
        id: entry.service,
        name: entry.service,
        description: '',
      };
    }

    const config = entry.config ?? {};
    const dbRaw = typeof config.database === 'string' ? config.database : undefined;
    const initRaw = typeof config.init === 'string' ? config.init : undefined;
    const database = dbRaw
      ? substituteParams(dbRaw, params, `${templateId}/${entry.service}.database`)
      : undefined;

    const resolved: ResolvedService = {
      id: s.id,
      name: s.name,
      description: s.description,
      docsUrl: buildUisDocsUrl(s.docs) ?? undefined,
      website: s.website,
      exposePort: s.exposePort,
      namespace: s.namespace,
      helmChart: s.helmChart,
      database,
      generatedUser,
      initFilePath: initRaw,
      transitiveRequires: resolveTransitiveDeps(s.requires, uisServices),
    };

    // App templates: attach manifest-derived values to the FIRST service entry
    // only. Multi-service templates will need per-service manifest extraction
    // when they exist (currently every app template has exactly one requires
    // entry, so this is fine).
    // TODO(multi-service): per-service manifest reads when templates need them
    if (templateKind === 'app' && idx === 0 && manifest) {
      resolved.envVar = manifest.envVar;
      resolved.secretName = manifest.secretName;
      resolved.containerPort = manifest.containerPort;
    }

    return resolved;
  });
}

/**
 * Read manifests/deployment.yaml from a template's source directory and
 * extract the env var name, secret name pattern, and container port.
 *
 * Assumptions (matching every current template):
 *  - single container per pod -> uses containers[0]
 *  - exactly one env entry that uses secretKeyRef -> uses env[0]
 *
 * Returns undefined if the manifest is missing or any field is absent. The
 * card will simply not show the missing fields.
 */
function readDeploymentManifest(
  templateDir: string,
  params: Record<string, string> | undefined,
  templateId: string,
): DeploymentManifestExtract | undefined {
  const manifestPath = join(templateDir, 'manifests', 'deployment.yaml');
  if (!existsSync(manifestPath)) return undefined;

  // K8s manifests are commonly multi-document YAML (Deployment + Service +
  // ConfigMap, separated by ---). Use loadAll and pick the Deployment doc.
  let docs: unknown[];
  try {
    docs = yaml.loadAll(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    warn(`${templateId}: failed to parse manifests/deployment.yaml: ${(e as Error).message}`);
    return undefined;
  }

  const deployment = docs.find(
    (d) => (d as {kind?: string})?.kind === 'Deployment',
  ) as
    | {
        spec?: {template?: {spec?: {containers?: Array<unknown>}}};
      }
    | undefined;

  if (!deployment) {
    warn(`${templateId}: manifests/deployment.yaml has no kind:Deployment document`);
    return undefined;
  }

  // Navigate the K8s Deployment shape defensively. We use containers[0] and
  // env[0] which is true for all current templates.
  const container = deployment.spec?.template?.spec?.containers?.[0] as
    | {
        env?: Array<{
          name?: string;
          valueFrom?: {secretKeyRef?: {name?: string}};
        }>;
        ports?: Array<{containerPort?: number}>;
      }
    | undefined;

  if (!container) {
    warn(`${templateId}: manifests/deployment.yaml has no containers[0]`);
    return undefined;
  }

  const envEntry = container.env?.[0];
  const portEntry = container.ports?.[0];

  const envVar = typeof envEntry?.name === 'string' ? envEntry.name : undefined;
  const secretNameRaw =
    typeof envEntry?.valueFrom?.secretKeyRef?.name === 'string'
      ? envEntry.valueFrom.secretKeyRef.name
      : undefined;
  const containerPort =
    typeof portEntry?.containerPort === 'number' ? portEntry.containerPort : undefined;

  const secretName = secretNameRaw ? substituteRepoName(secretNameRaw, params) : undefined;

  return {envVar, secretName, containerPort};
}

/**
 * Read every init file referenced by a template's services and return them as
 * a record keyed by the relative path. Skips silently with a warning when a
 * file is missing.
 */
function readInitFiles(
  templateDir: string,
  serviceEntries: Array<{service: string; config?: Record<string, unknown>}> | undefined,
  templateId: string,
): Record<string, string> {
  if (!serviceEntries) return {};
  const result: Record<string, string> = {};
  for (const entry of serviceEntries) {
    const initPath = entry.config?.init;
    if (typeof initPath !== 'string' || initPath.length === 0) continue;
    const fullPath = join(templateDir, initPath);
    if (!existsSync(fullPath)) {
      warn(`${templateId}: init file not found at ${initPath}`);
      continue;
    }
    try {
      result[initPath] = readFileSync(fullPath, 'utf8');
    } catch (e) {
      warn(`${templateId}: failed to read init file ${initPath}: ${(e as Error).message}`);
    }
  }
  return result;
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
  if (!Array.isArray(tmpl.links) || tmpl.links.length === 0) {
    fail(`${file}: links must be a non-empty array (at least a source code link)`);
  }
  if (!Array.isArray(tmpl.maintainers) || tmpl.maintainers.length === 0) {
    fail(`${file}: maintainers must be a non-empty array (at least one GitHub username)`);
  }
  if (!Array.isArray(tmpl.prerequisites) || tmpl.prerequisites.length === 0) {
    fail(`${file}: prerequisites must be a non-empty array (at least "DCT devcontainer running")`);
  }
}

// --- Main ---

console.log('Loading vendored platform data...');
const dctTools = loadDctTools();
const uisServices = loadUisServices();
console.log(`  ${dctTools.size} DCT tools, ${uisServices.size} UIS services`);

console.log('\nScanning for template-categories.yaml files...');
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
    const templateDir = dirname(file);
    console.log(`  ${folderName}/${dirName}/template-info.yaml`);

    const rawYamlText = readFileSync(file, 'utf8');
    const raw = yaml.load(rawYamlText) as TemplateInfoYaml;
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
      maintainers: Array.isArray(raw.maintainers) ? raw.maintainers : [],
      links: Array.isArray(raw.links) ? raw.links : [],
      prerequisites: Array.isArray(raw.prerequisites) ? raw.prerequisites : [],
      related: Array.isArray(raw.related) ? raw.related : [],
      context,
    };

    // Optional fields — only include if present
    if (raw.params) entry.params = raw.params;
    if (raw.requires) entry.requires = raw.requires;
    if (raw.provides) entry.provides = raw.provides;
    if (raw.quickstart) entry.quickstart = raw.quickstart;
    if (raw.configure_command) entry.configureCommand = raw.configure_command;

    // Raw template-info.yaml content — rendered as a collapsible dropdown
    // inside the Environment card's Configure sub-section so developers can
    // see the full editable surface of the template without opening the
    // source. Only emitted for templates that have a Configure sub-section
    // (i.e. those with requires:); skipping others keeps the registry smaller
    // and avoids emitting the field where the component wouldn't use it.
    if (raw.requires && raw.requires.length > 0) {
      entry.templateInfoYaml = rawYamlText;
    }

    // ── Environment-card resolution (Phase 2+3 of PLAN-environment-card.md) ─

    // Template kind comes from install_type which the template author already
    // declares. Stack templates use `provides.services:`; everything else
    // (app, overlay) consumes services via `requires:` (if any). The kind
    // drives the header label of the cluster section in the Environment card.
    const templateKind: TemplateKind = raw.install_type === 'stack' ? 'stack' : 'app';
    entry.templateKind = templateKind;

    // Pick the service list from whichever field applies.
    const serviceList = templateKind === 'stack' ? raw.provides?.services : raw.requires;

    // Resolve tools (DCT)
    entry.resolvedTools = resolveTools(raw.tools, dctTools, raw.id);

    // For app templates, read manifests/deployment.yaml to extract env_var,
    // secret_name, container_port. Stack templates skip this step — they
    // have no consumer manifest.
    let manifestExtract: DeploymentManifestExtract | undefined;
    if (templateKind === 'app') {
      manifestExtract = readDeploymentManifest(templateDir, raw.params, raw.id);
    }
    if (manifestExtract) {
      entry.manifest = manifestExtract;
    }

    // Resolve services (UIS) and merge in manifest-derived values
    entry.resolvedServices = resolveServices(
      serviceList,
      uisServices,
      raw.params,
      manifestExtract,
      templateKind,
      raw.id,
    );

    // Read init SQL files for the collapsible block
    entry.resolvedInitFiles = readInitFiles(templateDir, serviceList, raw.id);

    // Auto-generated ## Architecture section (PLAN-template-architecture-diagram.md).
    // The full MDX block (headings + fenced mermaid code blocks) is pre-composed
    // here so generate-docs-markdown.sh can paste it verbatim with a one-line
    // jq read — all conditional logic lives in TypeScript. Overlay templates get
    // null and the bash emitter suppresses the section entirely.
    const {mdx: architectureMdx} = buildArchitectureMdx(entry as ArchitectureTemplateEntry);
    entry.architectureMdx = architectureMdx;

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
  dctDocsBase: DCT_DOCS_BASE,
  uisDocsBase: UIS_DOCS_BASE,
  categories: allCategories,
  templates: allTemplates,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2) + '\n');
console.log(`\nGenerated ${OUTPUT_PATH}`);
console.log(`  ${allCategories.length} categories, ${allTemplates.length} templates`);
if (warnings.length > 0) {
  console.log(`  ${warnings.length} warning(s) — see above`);
}

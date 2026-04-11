/**
 * dct-doc-paths.ts — DCT tool documentation URL helper
 *
 * SHIM FILE — temporary. Used by `scripts/generate-registry.ts` to build
 * documentation URLs for DCT tools at the time the website registry is
 * generated. Each tool entry in `dct-tools.json` has a `category` and an `id`,
 * but no `docs` field. To build a working URL we have to:
 *
 *   1. Map the category ID (e.g. "LANGUAGE_DEV") to its URL slug on the DCT
 *      docs site (e.g. "development-tools"). This map is hand-curated and
 *      verified against the live site at https://dct.sovereignsky.no.
 *   2. Strip the "dev-" or "tool-" prefix from the tool ID (e.g. "dev-golang"
 *      -> "golang") to get the URL tail.
 *   3. Concatenate: ${DCT_DOCS_BASE}/docs/tools/${slug}/${idTail}
 *
 * Why a shim: DCT does not (yet) publish a `docs` field per tool in
 * `tools.json`. UIS already publishes `docs: "/docs/services/..."` per service
 * in `services.json`, so service URLs need no shim. If DCT later adds a `docs`
 * field, this whole file can be deleted and the script can read the URL
 * directly from `dct-tools.json`.
 *
 * Verified examples (by visiting each on the live DCT site):
 *   dev-python  (LANGUAGE_DEV) -> /docs/tools/development-tools/python
 *   dev-golang  (LANGUAGE_DEV) -> /docs/tools/development-tools/golang
 *   dev-cpp     (LANGUAGE_DEV) -> /docs/tools/development-tools/cpp
 *   tool-iac    (INFRA_CONFIG) -> /docs/tools/infrastructure-configuration/iac
 *
 * The full set of categories below was derived from DCT's own
 * website/src/data/categories.json. The category slugs follow the rule
 * "lowercase the name, drop '&', collapse spaces to dashes" — but the rule
 * is brittle (depends on DCT's Docusaurus URL config), which is the reason
 * we maintain this map by hand and verify it via the link-check step in
 * Phase 4 of PLAN-environment-card.md.
 */

export const DCT_DOCS_BASE = 'https://dct.sovereignsky.no';
export const UIS_DOCS_BASE = 'https://uis.sovereignsky.no';

/**
 * Category ID (as it appears in dct-tools.json `.tools[].category`) -> URL
 * slug as used on the DCT docs site.
 */
export const DCT_CATEGORY_SLUGS: Record<string, string> = {
  SYSTEM_COMMANDS: 'system-commands',
  LANGUAGE_DEV: 'development-tools',
  AI_TOOLS: 'ai-machine-learning-tools',
  CLOUD_TOOLS: 'cloud-infrastructure-tools',
  DATA_ANALYTICS: 'data-analytics-tools',
  BACKGROUND_SERVICES: 'background-services-daemons',
  INFRA_CONFIG: 'infrastructure-configuration',
  CONTRIBUTOR_TOOLS: 'contributor-tools',
  FRAMEWORKS: 'frameworks-standalone-binaries',
};

/**
 * Strip the conventional DCT tool ID prefix to get the URL tail.
 *   "dev-golang" -> "golang"
 *   "tool-iac"   -> "iac"
 *   "claude"     -> "claude"  (no prefix to strip)
 */
export function stripDctIdPrefix(id: string): string {
  return id.replace(/^(dev-|tool-)/, '');
}

/**
 * Build the full DCT docs URL for a tool, or return null if the category is
 * unknown (the caller should log a warning and fall back to no link).
 */
export function buildDctToolDocsUrl(
  toolId: string,
  category: string,
): string | null {
  const slug = DCT_CATEGORY_SLUGS[category];
  if (!slug) return null;
  const tail = stripDctIdPrefix(toolId);
  return `${DCT_DOCS_BASE}/docs/tools/${slug}/${tail}`;
}

/**
 * Build the full UIS docs URL for a service. UIS publishes the relative path
 * directly (`docs: "/docs/services/databases/postgresql"`), so this is just a
 * trivial concat. Returns null if the input is empty.
 */
export function buildUisDocsUrl(uisDocsPath: string | undefined): string | null {
  if (!uisDocsPath) return null;
  return `${UIS_DOCS_BASE}${uisDocsPath}`;
}

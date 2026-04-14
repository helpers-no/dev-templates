/**
 * build-expected-output.ts — auto-generate the "Expected output" sample
 * block that the Environment card renders inside its Configure sub-section,
 * replacing the hand-written version that lived in the database template's
 * README.
 *
 * The generator emits a string that mimics what DCT actually prints when
 * a developer runs the configure flow (`dev-template configure` for app
 * templates; `uis template install <id>` for stack templates). Every value
 * is derived from the registry entry — there are no placeholders a user
 * has to substitute, and no hand-maintained copies per template.
 *
 * Archetypes:
 *   E1  (app + requires: + manifest)  → dev-template configure format
 *   E2  (app + manifest, no requires) → null (no configure step)
 *   E3  (stack + provides.services)   → uis template install format
 *   E4  (overlay)                     → null
 *
 * Multi-service templates are not supported in v1; they throw at generate
 * time — same rule as the architecture mermaid builder.
 *
 * // Last verified against DCT v1.7.36 on 2026-04-14
 *
 * DRIFT POLICY (per investigation Q2):
 *   When DCT updates its runtime output format, this generator will
 *   silently drift. The header comment above names the version this
 *   module was last verified against. A future maintainer who notices
 *   drift should (a) re-verify against the current DCT output, (b)
 *   update the generator's format templates, and (c) update the date/
 *   version in the header comment.
 */

import { getInClusterPort } from './service-ports.ts';
import type { TemplateEntry } from './build-architecture-mermaid.ts';

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the expected-output sample for a registry entry. Returns null
 * for archetypes that don't have a configure flow (E2 and E4). The
 * caller should render the output inside a collapsible `<details>`
 * block in the Environment card's Configure sub-section (or omit the
 * block entirely when null).
 */
export function buildExpectedOutput(entry: TemplateEntry): string | null {
  if (entry.install_type === 'overlay') return null;
  if (entry.install_type === 'stack') {
    return buildStackExpectedOutput(entry);
  }
  // app template
  if (!entry.resolvedServices || entry.resolvedServices.length === 0) {
    return null; // E2 — app without services, no configure flow
  }
  return buildAppExpectedOutput(entry);
}

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────

const DIVIDER = '━'.repeat(65);

function assertSingleService(entry: TemplateEntry): void {
  if (entry.resolvedServices.length > 1) {
    throw new Error(
      `build-expected-output: multi-service templates are not yet supported; ` +
        `template '${entry.id}' has ${entry.resolvedServices.length} resolved services.`,
    );
  }
}

/**
 * Extract the first (and by v1 contract, only) init file's content
 * and path. Returns undefined for templates with no init files.
 */
function firstInitFile(entry: TemplateEntry): { path: string; content: string } | undefined {
  if (!entry.resolvedInitFiles) return undefined;
  const entries = Object.entries(entry.resolvedInitFiles);
  if (entries.length === 0) return undefined;
  const [path, content] = entries[0]!;
  return { path, content };
}

function byteSize(s: string): number {
  // Byte count (not code-unit count) — matches the unix `wc -c` behavior
  // and DCT's real output.
  return new TextEncoder().encode(s).length;
}

function lineCount(s: string): number {
  // Trailing newline doesn't count as a new line (matches `wc -l`).
  const trimmed = s.endsWith('\n') ? s.slice(0, -1) : s;
  return trimmed === '' ? 0 : trimmed.split('\n').length;
}

function formatParams(params: Record<string, unknown> | undefined): string[] {
  if (!params) return [];
  const keys = Object.keys(params);
  if (keys.length === 0) return [];
  const maxKey = Math.max(...keys.map((k) => k.length));
  return keys.map((k) => `   ${k.padEnd(maxKey)} = ${params[k]}`);
}

// ────────────────────────────────────────────────────────────────────────────
// E1 — app + services + manifest (dev-template configure flow)
// ────────────────────────────────────────────────────────────────────────────

function buildAppExpectedOutput(entry: TemplateEntry): string {
  assertSingleService(entry);
  const svc = entry.resolvedServices[0]!;
  const appName = (entry.params?.app_name as string | undefined) ?? entry.id;
  const db = svc.database ?? 'db';
  const exposePort = svc.exposePort ?? 35432;
  const inClusterPort = getInClusterPort(svc.id);
  const ns = svc.namespace ?? 'default';
  const envVar = entry.manifest?.envVar ?? 'DATABASE_URL';
  const secretName = entry.manifest?.secretName ?? `${appName}-db`;

  const lines: string[] = [];
  lines.push('🔧 Template Configure');
  lines.push(DIVIDER);
  lines.push('');
  lines.push('🔌 Checking UIS bridge...');
  lines.push('   ✓ uis-provision-host container is running');
  lines.push('');
  lines.push('🔍 Detecting git identity...');
  lines.push(`   ✓ Repo:   yourorg/${appName}`);
  lines.push('   ✓ Branch: main');
  lines.push('');
  lines.push('📄 Reading template-info.yaml...');
  lines.push('   ✓ File: /workspace/template-info.yaml');
  lines.push(`   ✓ ID:   ${entry.id}`);
  lines.push(`   ✓ Type: ${entry.install_type}`);
  lines.push('');

  // Parameters block
  const paramLines = formatParams(entry.params);
  if (paramLines.length > 0) {
    lines.push('📝 Parameters:');
    lines.push(...paramLines);
    lines.push('');
  }

  lines.push(`🔧 Configuring 1 service requirement...`);
  lines.push('');

  // Service detail block
  const serviceBanner = `   ─── ${svc.id} ${'─'.repeat(Math.max(0, 60 - svc.id.length))}`;
  lines.push(serviceBanner);
  lines.push(`   Database:           ${db}`);
  lines.push(`   K8s namespace:      ${ns}`);
  lines.push(`   K8s secret prefix:  ${appName}`);
  lines.push(`   Env var:            ${envVar}`);
  lines.push('');

  // Init file block (optional)
  const init = firstInitFile(entry);
  if (init) {
    const size = byteSize(init.content);
    const count = lineCount(init.content);
    lines.push('   📄 Reading init file...');
    lines.push(`   ✓ Path: ${init.path}`);
    lines.push(`   ✓ Size: ${size} bytes (${count} lines)`);
    lines.push('');
  }

  // UIS call
  lines.push('   📡 Calling UIS (you can copy-paste this to debug):');
  lines.push(`      docker exec -i uis-provision-host uis configure ${svc.id} ${appName} \\`);
  lines.push(`        --database ${db} \\`);
  lines.push(`        --namespace ${ns} \\`);
  lines.push(`        --secret-name-prefix ${appName} \\`);
  if (init) {
    lines.push(`        --init-file - \\`);
    lines.push(`        --json \\`);
    lines.push(`        < ${init.path}`);
  } else {
    lines.push(`        --json`);
  }
  lines.push('');
  lines.push('   Waiting for UIS response...');
  lines.push('   ✓ Status: ok (took 2s)');
  lines.push('');
  lines.push('   📦 UIS created:');
  lines.push(`      Database: ${db}`);
  lines.push(`      Username: ${appName.replace(/-/g, '_')}`);
  lines.push('      Password: *** (hidden)');
  lines.push('');

  // Port-forward ASCII art
  lines.push('   🔌 Port forward (created by UIS, lives inside uis-provision-host):');
  lines.push('');
  lines.push('      ┌─────────────────────────────────────────────────┐');
  lines.push(`      │  DCT  →  host.docker.internal:${exposePort}             │  ← your app connects here`);
  lines.push('      └─────────────────────────────────────────────────┘');
  lines.push('                       ↕');
  lines.push('      ┌─────────────────────────────────────────────────┐');
  lines.push(`      │  Mac/Linux host  →  port ${exposePort}                  │  ← Docker port-publish`);
  lines.push('      └─────────────────────────────────────────────────┘');
  lines.push('                       ↕');
  lines.push('      ┌─────────────────────────────────────────────────┐');
  lines.push(`      │  uis-provision-host container  →  port ${exposePort}    │  ← kubectl port-forward`);
  lines.push('      └─────────────────────────────────────────────────┘    lives inside this container');
  lines.push('                       ↕');
  lines.push('      ┌─────────────────────────────────────────────────┐');
  lines.push(`      │  K8s: ${svc.id}.${ns}.svc.cluster.local:${inClusterPort} │  ← actual ${svc.id} pod`);
  lines.push('      └─────────────────────────────────────────────────┘');
  lines.push('');
  lines.push('      Survives DCT rebuilds. Dies if you restart uis-provision-host.');
  lines.push(`      Manage:  uis expose --status                (list all forwards)`);
  lines.push(`               uis expose ${svc.id} --stop       (tear down this one)`);
  lines.push('');
  lines.push('   💾 Writing local URL to .env...');
  lines.push('   ✓ File:  /workspace/.env');
  lines.push(`   ✓ Key:   ${envVar}`);
  lines.push(
    `   ✓ Value: ${svc.id}://${appName.replace(/-/g, '_')}:***@host.docker.internal:${exposePort}/${db}`,
  );
  lines.push('');
  lines.push('   🔐 K8s Secret (created by UIS for ArgoCD/in-cluster pods):');
  lines.push(`      Name:      ${secretName}`);
  lines.push(`      Namespace: ${appName}`);
  lines.push(`      Key:       ${envVar}`);
  lines.push(`      Verify:    kubectl get secret ${secretName} -n ${appName}`);
  lines.push('');
  lines.push(DIVIDER);
  lines.push('✅ Configuration complete (1 configured, 0 skipped, 0 failed)');
  lines.push('   Total time: 2s');
  lines.push(DIVIDER);
  lines.push('');
  lines.push('📋 Next steps:');
  lines.push(`   • Verify the database:    uis connect ${svc.id} ${db}`);
  lines.push(`   • Check the K8s secret:   kubectl get secret ${secretName} -n ${appName}`);
  lines.push('   • Check port forwards:    uis expose --status');
  const runCmd = entry.quickstart?.run;
  if (runCmd) {
    lines.push(`   • Run the app:            ${runCmd}`);
  } else {
    lines.push('   • Run the app:            see README for run instructions');
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// E3 — stack template (uis template install flow)
// ────────────────────────────────────────────────────────────────────────────

function buildStackExpectedOutput(entry: TemplateEntry): string | null {
  if (!entry.resolvedServices || entry.resolvedServices.length === 0) {
    return null;
  }
  assertSingleService(entry);
  const svc = entry.resolvedServices[0]!;
  const db = svc.database ?? 'db';
  const ns = svc.namespace ?? 'default';
  const exposePort = svc.exposePort ?? 35432;
  const inClusterPort = getInClusterPort(svc.id);

  const lines: string[] = [];
  lines.push(`🔧 UIS Template Install: ${entry.id}`);
  lines.push(DIVIDER);
  lines.push('');
  lines.push('📄 Reading template-info.yaml...');
  lines.push(`   ✓ ID:   ${entry.id}`);
  lines.push(`   ✓ Type: ${entry.install_type}`);
  lines.push('');

  const paramLines = formatParams(entry.params);
  if (paramLines.length > 0) {
    lines.push('📝 Parameters:');
    lines.push(...paramLines);
    lines.push('');
  }

  lines.push(`🔧 Provisioning 1 service...`);
  lines.push('');
  const serviceBanner = `   ─── ${svc.id} ${'─'.repeat(Math.max(0, 60 - svc.id.length))}`;
  lines.push(serviceBanner);
  lines.push(`   Database:     ${db}`);
  lines.push(`   Namespace:    ${ns}`);

  const init = firstInitFile(entry);
  if (init) {
    const size = byteSize(init.content);
    const count = lineCount(init.content);
    lines.push(`   Init file:    ${init.path} (${size} bytes, ${count} lines)`);
  }
  lines.push('');

  lines.push('   📡 Calling UIS:');
  lines.push(`      docker exec -i uis-provision-host uis deploy ${svc.id} \\`);
  lines.push(`        --database ${db} \\`);
  lines.push(`        --namespace ${ns} \\`);
  if (init) {
    lines.push(`        --init-file - \\`);
    lines.push(`        < ${init.path}`);
  } else {
    lines.push(`        --json`);
  }
  lines.push('');
  lines.push(`   ✓ ${svc.name} deployed`);
  lines.push(`   ✓ Database ${db} created + seeded`);
  lines.push(
    `   ✓ Port-forward: host.docker.internal:${exposePort} → ${svc.id}.${ns}.svc:${inClusterPort}`,
  );
  lines.push('');
  lines.push(DIVIDER);
  lines.push('✅ Stack installed (1 service)');
  lines.push(DIVIDER);
  lines.push('');
  lines.push('📋 Next steps:');
  lines.push(`   • Verify:                 uis connect ${svc.id} ${db}`);
  lines.push('   • Check port forwards:    uis expose --status');
  lines.push('   • Consumer templates:     see the "Related" links on this page');

  return lines.join('\n');
}

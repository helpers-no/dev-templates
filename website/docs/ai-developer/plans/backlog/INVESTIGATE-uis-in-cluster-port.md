# Investigate: Add `inClusterPort` to UIS `services.json`

> **IMPLEMENTATION RULES:** Before implementing this plan, read and follow:
> - [WORKFLOW.md](../../WORKFLOW.md) - The implementation process
> - [PLANS.md](../../PLANS.md) - Plan structure and best practices

## Status: Backlog (cross-repo investigation — TMP consumer, UIS owner)

**Goal**: Determine how UIS should surface the in-cluster port for each service it manages (the upstream Helm chart's default service port), so downstream consumers like TMP's template-registry generator and documentation builders can render accurate "pod connects to `<service>.svc.cluster.local:<port>`" labels and instructions without hardcoding.

**Last Updated**: 2026-04-13

**Owner of implementation**: UIS (`urbalurba-infrastructure`) — this investigation documents the TMP consumer's need so UIS can plan and ship the field. TMP's work to consume the field is tracked separately in [INVESTIGATE-environment-card-improvements.md](../completed/INVESTIGATE-environment-card-improvements.md).

---

## Background

TMP (dev-templates) generates per-template documentation pages and Mermaid diagrams that describe the full local-development and deployment flow. Two places in the generated output need the **in-cluster service port**:

1. **Architecture deploy flowchart** (`scripts/lib/build-architecture-mermaid.ts`, deploy diagram): the edge `pod -->|<namespace>.svc.cluster.local:<port>| svc` shows the deployed app pod connecting to the service inside the cluster. Today this port is **hardcoded `5432`** in the builder because we only support PostgreSQL.

2. **Expected-output generator** (planned in [INVESTIGATE-environment-card-improvements.md](../completed/INVESTIGATE-environment-card-improvements.md)): the port-forward ASCII diagram and the in-cluster URL both reference the in-cluster port number.

When the first non-postgres service is added (redis, mongodb, mysql, etc.), the hardcoded `5432` becomes wrong. A scalable solution is needed.

---

## Current state

### What UIS `services.json` already provides (per service)

Verified 2026-04-13 on the vendored copy at `website/src/data/uis-services.json`:

```
@type, abstract, category, checkCommand, configurable, description, docs,
exposePort, helmChart, id, logo, name, namespace, playbook, priority,
removePlaybook, summary, tags, website
```

Key existing fields:
- **`exposePort`** — the *host-facing* port after `kubectl port-forward` (e.g., `35432` for postgresql). This is what the app in DCT dials via `host.docker.internal:<exposePort>`.
- **`namespace`** — default namespace where the service runs (e.g., `default`).
- **`helmChart`** — the helm chart used (e.g., `bitnami/postgresql`).

### What is MISSING

There is no field for the **in-cluster Kubernetes Service port** — the port number that an in-cluster client (e.g., a deployed app pod) would dial:

```
<service-name>.<namespace>.svc.cluster.local:<in-cluster port>
```

For the current services supported by UIS:

| Service | `exposePort` (host) | In-cluster port (missing) |
|---|---|---|
| postgresql | 35432 | 5432 |
| redis | 36379 | 6379 |
| mongodb | 37017 | 27017 |
| mysql | 33306 | 3306 |
| rabbitmq | 35672 | 5672 |

These values are properties of each service's underlying Helm chart default. UIS knows them (they're in the playbooks and values files). They just aren't surfaced on the public `services.json` entry.

---

## Why TMP cannot derive this locally

1. **Not in the manifest**: consumer app manifests (`manifests/deployment.yaml`) reference the secret/env var but not the in-cluster port — the port is embedded in the `DATABASE_URL` *value*, not as a separate field the generator can extract without parsing the URL.

2. **Not on the service entry**: as shown above, `services.json` only has `exposePort`.

3. **Not in the template-info.yaml**: the template declares `requires: [postgresql]` but not the service's port (because it's a property of the service, not the consumer).

4. **Convention-based derivation is fragile**: there's an apparent convention `inClusterPort = exposePort - 30000` (postgres 5432→35432, redis 6379→36379). This works today but:
   - It's undocumented and unguaranteed
   - A service that doesn't follow it breaks silently
   - Future UIS refactoring could change the convention with no warning
   - No way to validate — the builder can't know if the derived value is correct

5. **Hardcoded map in TMP is a stopgap**: a small `service-ports.ts` map in TMP works for v1 (see INVESTIGATE-environment-card-improvements.md § Option B) but duplicates knowledge UIS already has and drifts when UIS adds/removes/renames services.

---

## Options for UIS

### Option 1: Add `inClusterPort: number` to `services.json` entries

The simplest approach. Each service entry gains one new field:

```json
{
  "id": "postgresql",
  "name": "PostgreSQL",
  "exposePort": 35432,
  "inClusterPort": 5432,
  "namespace": "default",
  ...
}
```

**Pros:**
- Zero ambiguity — one field, one value per service
- Backward compatible — existing consumers that don't read the field continue to work
- Matches the existing `exposePort` pattern (both are port numbers with clear semantics)
- Easy to validate in UIS's own CI (check that it matches the service's helm values)

**Cons:**
- Requires UIS to know each chart's service port and maintain it when upgrading charts
- Doesn't handle services that expose multiple ports (postgres is single-port; something like rabbitmq exposes 5672 + 15672 + 25672)

### Option 2: Add `ports: { [name]: number }` to `services.json` entries

A structured map for services with multiple ports:

```json
{
  "id": "postgresql",
  "ports": {
    "postgres": 5432
  }
}
{
  "id": "rabbitmq",
  "ports": {
    "amqp": 5672,
    "management": 15672,
    "clustering": 25672
  }
}
```

**Pros:**
- Handles multi-port services cleanly
- Matches Kubernetes `Service.spec.ports[].name` convention
- Extensible — can add `protocol`, `targetPort`, etc. later

**Cons:**
- More complex than Option 1
- Consumers have to know which port name to read (`ports.postgres` vs `ports.amqp`) — adds coupling
- Most consumers only care about the "primary" port

### Option 3: Add both `inClusterPort` (primary) and optional `additionalPorts`

Hybrid — the common case gets a simple field, multi-port services add a secondary array:

```json
{
  "id": "postgresql",
  "inClusterPort": 5432
}
{
  "id": "rabbitmq",
  "inClusterPort": 5672,
  "additionalPorts": [
    { "name": "management", "port": 15672 },
    { "name": "clustering", "port": 25672 }
  ]
}
```

**Pros:**
- Simple common case + flexibility for multi-port
- Consumers that only need the primary port just read `inClusterPort`

**Cons:**
- Two fields to maintain
- Primary/secondary distinction is arbitrary for services like rabbitmq where management and amqp ports are both "real"

### Option 4: Inline the in-cluster URL template as a separate field

```json
{
  "id": "postgresql",
  "inClusterUrlTemplate": "postgresql://{{ user }}:{{ password }}@{{ service }}.{{ namespace }}.svc.cluster.local:5432/{{ database }}"
}
```

**Pros:**
- Encodes the full connection string shape, not just the port
- Consumers don't need to know protocol, path conventions, etc.

**Cons:**
- Way too specific — bakes in connection-string formatting choices that might vary per consumer
- Hard to extract just the port for a non-URL use case
- Templating language inside data is a code smell

---

## Recommendation

**Option 1 (`inClusterPort` single field).** Simplest, matches `exposePort` in style, backward compatible, handles 90% of cases (single-port services). For the rare multi-port case, UIS can add `additionalPorts` later without breaking existing consumers.

Write-up for UIS:

> Add an `inClusterPort: number` field to each service entry in `services.json`. The value is the primary service port inside the Kubernetes cluster (what a pod would dial at `<service>.<namespace>.svc.cluster.local:<inClusterPort>`). For PostgreSQL this is `5432`, redis `6379`, mongodb `27017`, etc. The value comes from each service's Helm chart default.
>
> This enables downstream consumers (TMP documentation generators, template expected-output generators) to render accurate in-cluster URLs without hardcoding per-service ports or trusting the fragile `exposePort - 30000` convention.
>
> Implementation notes:
> - Backward compatible — consumers that don't read the field are unaffected
> - Should be validated in UIS CI against the actual helm chart values
> - For services with multiple ports, surface the primary one now; add `additionalPorts: [{name, port}]` later if needed

---

## TMP stopgap plan (until UIS ships)

1. **Create a small hardcoded map** in TMP at `scripts/lib/service-ports.ts`:

   ```ts
   /**
    * In-cluster service ports — stopgap until UIS adds inClusterPort to
    * services.json. See INVESTIGATE-uis-in-cluster-port.md.
    */
   export const IN_CLUSTER_PORTS: Record<string, number> = {
     postgresql: 5432,
     redis: 6379,
     mongodb: 27017,
     mysql: 3306,
     mariadb: 3306,
     elasticsearch: 9200,
     rabbitmq: 5672,
   };
   ```

2. **Use it from the builders** that need the in-cluster port — `build-architecture-mermaid.ts` (replacing the hardcoded `5432`) and `build-expected-output.ts`.

3. **When UIS ships `inClusterPort`**, delete `service-ports.ts` and read `resolvedServices[0].inClusterPort` from the registry entry instead. One-commit cleanup.

4. **File an issue** against the UIS repo (`urbalurba-infrastructure`) linking to this investigation. Action item for someone on the TMP team.

---

## Next Steps

- [ ] Someone on the TMP team files a GitHub issue against the UIS repo with the recommendation section above
- [ ] Link the UIS issue URL back to this investigation when filed
- [ ] Proceed with the TMP stopgap (hardcoded map) via `INVESTIGATE-environment-card-improvements.md` — does not wait on UIS
- [ ] When UIS ships `inClusterPort`, create a small `PLAN-drop-service-ports-map.md` to migrate TMP consumers to the registry field and delete the stopgap file

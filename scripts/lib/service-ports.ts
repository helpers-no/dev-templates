/**
 * service-ports.ts — in-cluster default ports, by UIS service id.
 *
 * STOPGAP. UIS services.json does not currently surface an
 * `inClusterPort` field — the port a service listens on inside
 * the cluster, as opposed to the host-forwarded `exposePort`.
 * Until UIS ships that field, consumers that need to render
 * the in-cluster port (architecture diagrams, expected-output
 * generator) import from this map instead of reading it off
 * `resolvedServices[i].inClusterPort`.
 *
 * See: website/docs/ai-developer/plans/backlog/INVESTIGATE-uis-in-cluster-port.md
 *
 * DELETE THIS FILE WHEN:
 *   1. UIS services.json gains an `inClusterPort` field per service
 *   2. generate-registry.ts resolves and attaches it to each
 *      entry in `resolvedServices`
 *   3. all importers of this module are migrated to read
 *      `service.inClusterPort` from the registry entry
 *
 * Until then, this table holds the upstream-default service ports
 * for the services the project templates actually use.
 */

export const SERVICE_PORTS: Record<string, number> = {
  postgresql: 5432,
  redis: 6379,
  mongodb: 27017,
  mysql: 3306,
};

/**
 * Look up a service's in-cluster port. Throws if the service is
 * not in the map so a contributor adding a new UIS service can't
 * silently get a bogus port in a rendered diagram.
 */
export function getInClusterPort(serviceId: string): number {
  const port = SERVICE_PORTS[serviceId];
  if (port === undefined) {
    throw new Error(
      `service-ports.ts: no in-cluster port defined for service '${serviceId}'. ` +
        `Add it to SERVICE_PORTS, or wait until UIS ships inClusterPort on services.json ` +
        `and migrate callers off this stopgap.`,
    );
  }
  return port;
}

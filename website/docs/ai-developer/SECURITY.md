---
mdx:
  format: md
---

# Security

Read this before writing anything sensitive into the repository or a published site.

---

## Secrets

Secrets never enter git. Tokens, kubeconfig, passwords, and private keys stay on the host.
This includes urb-agents: fleet records must not contain credentials.

## Public vs private

If this repository is world-readable, do not commit internal topology, addresses, capacity, or
runtime identifiers. `project-*.md` states which.

## Published docs (if any)

If this repo publishes a documentation site, `project-*.md` names who can read it and any
filename- or path-based restriction.

Do **not** copy another project's gate. Mimer happens to use oauth2-proxy + a `securedoc-`
filename prefix behind Okta. Atlas is public. Those facts belong in *their* `project-*.md`,
not here. Replace this section when this project has a real rule; keep the filename.

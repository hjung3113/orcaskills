# Bounded local capability discovery

Workflow Studio will discover only capabilities exposed by reviewed, supported integration adapters on the local machine. Each adapter may run fixed, non-interactive, read-only probes with short timeouts; it must not use credentials, log in, install or reconfigure a provider, call a remote catalog, or execute arbitrary PATH entries. This preserves predictable local behavior and keeps portable project configuration free of machine-specific and credential-bearing state.

## Consequences

Discovery can report only what an installed, already configured integration safely exposes. When a model list cannot be established, Studio reports that fact rather than inventing candidates; users can refresh explicitly after changing their local environment.

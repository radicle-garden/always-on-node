# Alloy Monitoring Architecture Redesign

## Problem

Alloy runs as a system service (user `alloy`) and needs to monitor rootless Podman containers running under the `radicle` user. Direct socket access to `/run/user/<UID>/podman/podman.sock` requires complex cross-user permissions (ACLs, socket group configuration) that are fragile and hard to maintain.

## Solution

Eliminate Alloy's need for Podman socket access by:
1. **Logs**: Route container logs through journald (Podman's `log_driver: journald`)
2. **Metrics**: Run cAdvisor as a user container that exposes metrics via HTTP

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Podman Containers (radicle user)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ *_seed   │  │ *_seed   │  │ cAdvisor │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│  log-driver:    log-driver:   reads socket                 │
│  journald       journald      :8080/metrics                │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        ▼             ▼             │
   ┌─────────────────────┐         │
   │     journald        │         │
   └──────────┬──────────┘         │
              │                     │
              ▼                     ▼
   ┌─────────────────────────────────────┐
   │            Alloy (system)           │
   │  - loki.source.journal (logs)       │
   │  - prometheus.scrape (cAdvisor)     │
   └──────────────────┬──────────────────┘
                      │
                      ▼
              Grafana Cloud
```

## Implementation Details

### 1. Container Labels (nodes.ts)

Add labels to containers created in `src/lib/server/services/nodes.ts` for log filtering and grouping:

**Node container (~line 247):**
```typescript
const nodeContainer = await docker.containerCreate(
  {
    Image: nodeImage,
    Labels: {
      "app": "garden-node",
      "component": "radicle-node",
      "user.handle": user.handle,
      "node.id": persistedNode.node_id,
    },
    Env: [...],
    // ... rest of config
  },
  { name: nodeContainerName, platform: "linux/arm64" },
);
```

**HTTPD container (~line 287):**
```typescript
const httpdContainer = await docker.containerCreate(
  {
    Image: httpdImage,
    Labels: {
      "app": "garden-node",
      "component": "radicle-httpd",
      "user.handle": user.handle,
      "node.id": persistedNode.node_id,
    },
    Env: [...],
    // ... rest of config
  },
  { name: httpdContainerName, platform: "linux/arm64" },
);
```

These labels appear in journald as `CONTAINER_LABEL_*` fields.

### 2. cAdvisor Quadlet (25_monitoring_agents.yml)

Add cAdvisor as a user-level quadlet that runs alongside other containers:

```yaml
- name: Create cAdvisor Quadlet
  containers.podman.podman_container:
    name: cadvisor
    image: "gcr.io/cadvisor/cadvisor:v0.49.1"
    ports:
      - "{{ cadvisor_port }}:8080"
    volumes:
      - "/run/user/{{ unix_user_id }}/podman/podman.sock:/var/run/docker.sock:ro"
    state: quadlet
    restart_policy: on-failure
    log_driver: journald
    quadlet_options:
      - "AutoUpdate=local"
      - |
        [Unit]
        After=podman.socket

        [Install]
        WantedBy=default.target
  notify:
    - reload systemd
    - restart cadvisor
```

Key points:
- Runs as same user as other containers (no permission issues)
- Mounts user's Podman socket internally
- Exposes metrics on HTTP port for Alloy to scrape

### 3. Alloy Config (alloy_config.j2)

**Remove socket-based components:**
- `discovery.docker "nodes"`
- `discovery.relabel "podman_nodes"`
- `loki.source.docker "garden_nodes"`
- `loki.relabel "garden_nodes_labels"`
- `prometheus.exporter.cadvisor "containers"`

**Add journal-based container logs:**
```hcl
// Container logs (via journald)
loki.source.journal "garden_containers" {
  max_age    = "12h"
  forward_to = [loki.process.garden_containers.receiver]
  matches    = "CONTAINER_LABEL_app=garden-node"
  labels     = {job = "garden", instance = "{{ inventory_hostname }}"}
}

loki.process "garden_containers" {
  forward_to = [loki.write.grafana_cloud_loki.receiver]

  stage.labels {
    values = {
      container_name = "CONTAINER_NAME",
      component      = "CONTAINER_LABEL_component",
      user_handle    = "CONTAINER_LABEL_user.handle",
    }
  }

  stage.static_labels {
    values = {
      app = "garden-node",
    }
  }
}
```

**Add cAdvisor HTTP scrape:**
```hcl
// Container metrics (via cAdvisor HTTP)
prometheus.scrape "cadvisor" {
  targets = [
    {
      "__address__" = "localhost:{{ cadvisor_port }}",
      "job"         = "cadvisor",
    },
  ]
  forward_to      = [prometheus.relabel.cadvisor_metrics.receiver]
  scrape_interval = "30s"
}
```

The existing `prometheus.relabel.cadvisor_metrics` block remains unchanged.

### 4. Playbook Cleanup (25_monitoring_agents.yml)

**Remove:**
- All podman socket permission tasks (ACLs, socket group, lingering)
- `podman` group from `alloy_user_groups`

**Simplify Alloy installation:**
```yaml
- name: Install Alloy
  ansible.builtin.include_role:
    name: grafana.grafana.alloy
  vars:
    alloy_user_groups:
      - systemd-journal
    alloy_config: "{{ lookup('ansible.builtin.template', '../templates/alloy_config.j2') }}"
```

## Benefits

1. **Simpler permissions**: No cross-user socket access needed
2. **More reliable**: No ACLs to manage or reset on reboot
3. **Consistent log pipeline**: All logs flow through journald
4. **Native container metrics**: cAdvisor has direct socket access as same user

## Migration Notes

- Existing containers need to be recreated to pick up new labels
- cAdvisor quadlet needs to be deployed before Alloy config changes
- No data loss expected during migration

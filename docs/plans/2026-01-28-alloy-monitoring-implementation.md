# Alloy Monitoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate cross-user socket access by routing container logs through journald and running cAdvisor as a user container.

**Architecture:** Podman containers log to journald (which Alloy already reads). cAdvisor runs as same user as containers, exposes HTTP metrics that Alloy scrapes. No socket permissions needed.

**Tech Stack:** Ansible, Podman Quadlets, Grafana Alloy, TypeScript (Docker SDK)

---

### Task 1: Add Container Labels to nodes.ts

**Files:**
- Modify: `src/lib/server/services/nodes.ts:247-280` (node container)
- Modify: `src/lib/server/services/nodes.ts:287-301` (httpd container)

**Step 1: Add Labels to node container**

In `src/lib/server/services/nodes.ts`, find the `docker.containerCreate` call for the node container (~line 247) and add the `Labels` field:

```typescript
const nodeContainer = await docker.containerCreate(
  {
    Image: nodeImage,
    Labels: {
      app: "garden-node",
      component: "radicle-node",
      "user.handle": user.handle,
      "node.id": persistedNode.node_id,
    },
    Env: [
      "RUST_LOG=debug",
      // ... rest unchanged
```

**Step 2: Add Labels to httpd container**

Find the `docker.containerCreate` call for the httpd container (~line 287) and add the `Labels` field:

```typescript
const httpdContainer = await docker.containerCreate(
  {
    Image: httpdImage,
    Labels: {
      app: "garden-node",
      component: "radicle-httpd",
      "user.handle": user.handle,
      "node.id": persistedNode.node_id,
    },
    Env: ["RUST_LOG=debug", "RUST_BACKTRACE=1", "RAD_HOME=/radicle"],
    // ... rest unchanged
```

**Step 3: Run type check**

Run: `pnpm check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/server/services/nodes.ts
git commit -m "feat(nodes): add container labels for monitoring

Labels added:
- app: garden-node
- component: radicle-node | radicle-httpd
- user.handle: owner's handle
- node.id: radicle node ID

These appear in journald as CONTAINER_LABEL_* fields for log filtering."
```

---

### Task 2: Add cAdvisor Quadlet to Playbook

**Files:**
- Modify: `infra/ansible/plays/25_monitoring_agents.yml`

**Step 1: Replace commented cAdvisor block with new rootless version**

Delete lines 45-86 (the commented-out cAdvisor block) and replace with:

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
        recreate: true
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

**Step 2: Uncomment cAdvisor enable task**

Find and uncomment lines 99-104:

```yaml
    - name: Enable container monitoring services
      systemd:
        name: "cadvisor.service"
        enabled: yes
        state: started
        scope: user
        daemon_reload: yes
```

**Step 3: Uncomment cAdvisor handler**

Find and uncomment lines 116-119:

```yaml
    - name: restart cadvisor
      systemd:
        name: "cadvisor.service"
        state: restarted
        scope: user
```

**Step 4: Commit**

```bash
git add infra/ansible/plays/25_monitoring_agents.yml
git commit -m "feat(ansible): add rootless cAdvisor quadlet

cAdvisor runs as user container with access to user's Podman socket.
Exposes metrics on HTTP port for Alloy to scrape."
```

---

### Task 3: Update Alloy Config - Remove Socket Components

**Files:**
- Modify: `infra/ansible/templates/alloy_config.j2`

**Step 1: Remove socket-based container discovery and logs**

Delete these blocks from `alloy_config.j2`:

1. `discovery.docker "nodes"` (lines 160-163)
2. `discovery.relabel "podman_nodes"` (lines 165-180)
3. `loki.source.docker "garden_nodes"` (lines 182-187)
4. `loki.relabel "garden_nodes_labels"` (lines 189-196)
5. `loki.process "garden_nodes"` (lines 198-208)

**Step 2: Remove built-in cAdvisor exporter**

Delete these blocks:

1. `prometheus.exporter.cadvisor "containers"` (lines 217-221)
2. `prometheus.scrape "scraper"` (lines 225-230)

Keep `prometheus.relabel "cadvisor_metrics"` - we'll reuse it.

**Step 3: Commit**

```bash
git add infra/ansible/templates/alloy_config.j2
git commit -m "refactor(alloy): remove socket-based container monitoring

Removed:
- discovery.docker (socket access)
- loki.source.docker (socket access)
- prometheus.exporter.cadvisor (built-in, uses socket)

Will be replaced with journald + HTTP scrape."
```

---

### Task 4: Update Alloy Config - Add Journal-Based Container Logs

**Files:**
- Modify: `infra/ansible/templates/alloy_config.j2`

**Step 1: Add container logs via journald**

After the `loki.process "cron"` block (~line 157), add:

```hcl

// Container logs (via journald, not socket)
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

**Step 2: Commit**

```bash
git add infra/ansible/templates/alloy_config.j2
git commit -m "feat(alloy): add journal-based container log collection

Container logs now flow through journald instead of socket access.
Filters on CONTAINER_LABEL_app=garden-node label.
Extracts container_name, component, user_handle as Loki labels."
```

---

### Task 5: Update Alloy Config - Add cAdvisor HTTP Scrape

**Files:**
- Modify: `infra/ansible/templates/alloy_config.j2`

**Step 1: Add cAdvisor scrape target**

In the metrics section, before `prometheus.relabel "cadvisor_metrics"`, add:

```hcl
// Container metrics (via cAdvisor HTTP endpoint)
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

**Step 2: Commit**

```bash
git add infra/ansible/templates/alloy_config.j2
git commit -m "feat(alloy): add cAdvisor HTTP scrape

Scrapes container metrics from cAdvisor's HTTP endpoint.
No socket access needed - cAdvisor handles Podman communication."
```

---

### Task 6: Simplify Alloy Playbook

**Files:**
- Modify: `infra/ansible/plays/25_monitoring_agents.yml`

**Step 1: Remove system_group from alloy_user_groups**

In the "Install Alloy" play, change `alloy_user_groups` from:

```yaml
        alloy_user_groups:
          - systemd-journal
          - "{{ system_group }}"
```

To:

```yaml
        alloy_user_groups:
          - systemd-journal
```

**Step 2: Commit**

```bash
git add infra/ansible/plays/25_monitoring_agents.yml
git commit -m "refactor(ansible): simplify Alloy permissions

Alloy no longer needs system_group membership.
Only systemd-journal group needed for log access."
```

---

### Task 7: Verify and Test

**Step 1: Run Ansible lint**

Run: `ansible-lint infra/ansible/plays/25_monitoring_agents.yml`
Expected: No errors

**Step 2: Verify Alloy config syntax**

Deploy to staging and check Alloy logs:
```bash
ssh nodes-staging.radicle.garden
sudo journalctl -u alloy -f
```

Expected: No config parsing errors

**Step 3: Verify cAdvisor is running**

```bash
ssh nodes-staging.radicle.garden
systemctl --user status cadvisor
curl localhost:{{ cadvisor_port }}/metrics | head -20
```

Expected: Service running, metrics returned

**Step 4: Verify container logs in Grafana Cloud**

In Grafana Cloud Loki, query:
```
{app="garden-node"}
```

Expected: Container logs with `component`, `container_name`, `user_handle` labels

**Step 5: Verify container metrics in Grafana Cloud**

In Grafana Cloud, query:
```
container_cpu_usage_seconds_total{job="cadvisor"}
```

Expected: CPU metrics for containers

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verification complete for monitoring redesign"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add container labels | `nodes.ts` |
| 2 | Add cAdvisor quadlet | `25_monitoring_agents.yml` |
| 3 | Remove socket components | `alloy_config.j2` |
| 4 | Add journal container logs | `alloy_config.j2` |
| 5 | Add cAdvisor HTTP scrape | `alloy_config.j2` |
| 6 | Simplify Alloy permissions | `25_monitoring_agents.yml` |
| 7 | Verify and test | N/A |

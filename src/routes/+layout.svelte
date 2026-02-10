<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";

  import "../app.css";

  let { children, data } = $props();

  onMount(async () => {
    if (!import.meta.env.DEV && data.fqdn) {
      const { init } = await import("@plausible-analytics/tracker");
      init({
        domain: data.fqdn,
      });
    }
  });
</script>

<ModeWatcher />
{@render children()}

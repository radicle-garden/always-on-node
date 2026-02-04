<script lang="ts">
  import * as nodeEvents from "$lib/nodeEvents";

  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";

  import "../app.css";

  let { children } = $props();

  onMount(() => {
    const disconnect = nodeEvents.connect();
    return disconnect;
  });
</script>

<ModeWatcher />
{@render children()}

<script lang="ts">
  import rawHtml from "$docs/webhooks-smoke-test.adoc";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let html = $derived(
    rawHtml.replaceAll("{{NODE_ID}}", data.nodeId ?? "&lt;your node ID&gt;"),
  );
</script>

<svelte:head>
  <title>Webhooks | Help | Radicle Garden</title>
</svelte:head>

<div class="flex flex-col gap-8">
  <div class="txt-heading-xxl">Webhooks</div>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="adoc-content txt-body-m-regular">{@html html}</div>
</div>

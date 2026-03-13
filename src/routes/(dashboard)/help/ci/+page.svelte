<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "$components/Icon.svelte";
  import html from "$docs/webhooks-quickstart.adoc";
</script>

<svelte:head>
  <title>CI &amp; Webhooks | Help | Radicle Garden</title>
</svelte:head>

<div class="flex flex-col gap-8">
  <div class="txt-heading-xxl">CI &amp; Webhooks</div>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="adoc-content txt-body-m-regular">{@html html}</div>
  <div class="grid grid-cols-1 grid-rows-2 gap-8 sm:grid-cols-2 sm:grid-rows-1">
    <div class="flex flex-col gap-8 rounded-sm bg-surface-subtle p-6">
      <div class="flex flex-col gap-2">
        <div class="txt-heading-m">Generic webhooks</div>
        <div class="txt-body-m-regular text-text-tertiary">
          Configure outgoing webhooks for any CI system that can receive HTTP
          POSTs.
        </div>
      </div>
      <a
        href={resolve("/help/ci/webhooks")}
        class="flex items-center gap-2 font-bold text-brand-hover hover:underline">
        Read more
        <Icon name="arrow-right" />
      </a>
    </div>
    <div class="flex flex-col gap-8 rounded-sm bg-surface-subtle p-6">
      <div class="flex flex-col gap-2">
        <div class="txt-heading-m">Jenkins</div>
        <div class="txt-body-m-regular text-text-tertiary">
          Step-by-step guide for wiring Jenkins up to your Radicle repo.
        </div>
      </div>
      <a
        href={resolve("/help/ci/jenkins")}
        class="flex items-center gap-2 font-bold text-brand-hover hover:underline">
        Read more
        <Icon name="arrow-right" />
      </a>
    </div>
  </div>
</div>

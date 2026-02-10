<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "$components/Icon.svelte";
  import { Button } from "$lib/components/ui/button";

  let { status, primaryButtonText } = $props();
</script>

<div
  class="flex min-h-[calc(100vh-15.5rem)] flex-col items-center justify-center gap-4 p-4">
  <div class="txt-heading-xxl">
    {status}
  </div>
  <div class="txt-body-l-regular text-center">
    {#if status === 404}
      Seems you've clicked a link that's not here anymore.
    {:else}
      Seems like the app is broken.
    {/if}
  </div>
  <Button variant="primary" href={resolve("/")}>
    {primaryButtonText}
  </Button>
  <Button variant="outline" href="https://radicle.zulipchat.com/">
    Get help on Zulip
    <Icon name="open-external" />
  </Button>
</div>

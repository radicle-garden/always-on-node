<script lang="ts">
  import { copyToClipboard } from "$lib/utils";

  import Icon from "./Icon.svelte";

  let { cmd }: { cmd: string } = $props();

  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleCopy(cmd: string) {
    copyToClipboard(cmd);
    copied = true;

    if (copyTimeout) {
      clearTimeout(copyTimeout);
    }
    copyTimeout = setTimeout(() => {
      copied = false;
      copyTimeout = null;
    }, 2000);
  }
</script>

<div
  role="button"
  tabindex="0"
  class="flex w-full cursor-pointer items-center gap-2 rounded-sm bg-surface-alpha-subtle px-4 py-3 font-mono"
  onclick={() => handleCopy(cmd)}
  onkeydown={e => {
    if (e.key === "Enter" || e.key === " ") {
      handleCopy(cmd);
    }
  }}>
  <span class="line-clamp-1 break-all">{cmd}</span>
  <span class="ml-auto"><Icon name={copied ? "checkmark" : "copy"} /></span>
</div>

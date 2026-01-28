<script lang="ts">
  import { copyToClipboard } from "$lib/utils";
  import { truncateText } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import Icon from "./Icon.svelte";

  let { rid }: { rid: string } = $props();

  let hovering = $state(false);
  let copied = $state(false);
</script>

<div class="flex font-mono text-text-tertiary">
  <button
    class="line-clamp-1 flex cursor-pointer items-center gap-1 truncate text-left break-all hover:underline"
    onmouseenter={() => {
      hovering = true;
    }}
    onmouseleave={() => {
      hovering = false;
    }}
    onclick={e => {
      e.stopPropagation();
      e.preventDefault();
      copyToClipboard(rid);
      copied = true;
      toast.success("Copied to clipboard");
      setTimeout(() => {
        copied = false;
      }, 2000);
    }}>
    {truncateText(rid, 6)}
    {#if hovering && !copied}
      <Icon name="copy" />
    {:else if hovering && copied}
      <Icon name="checkmark" />
    {/if}
  </button>
</div>

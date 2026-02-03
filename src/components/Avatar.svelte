<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { gravatarURL } from "$lib/utils";

  let {
    email,
    username,
    gravatarSize,
    class: className = "",
  }: {
    email: string;
    username: string;
    gravatarSize: number;
    class?: string;
  } = $props();

  type State = "loading" | "loaded" | "failed";
  let state = $state<State>("loading");

  let initial = $derived(username.charAt(0).toUpperCase());
</script>

{#if state === "loading"}
  <div class="relative h-full w-full">
    <Skeleton
      class="h-full w-full {className} rounded-none bg-surface-strong" />
    <img
      class="absolute h-0 w-0 opacity-0"
      alt=""
      src={gravatarURL(email, gravatarSize)}
      onload={() => {
        state = "loaded";
      }}
      onerror={() => {
        state = "failed";
      }} />
  </div>
{:else if state === "loaded"}
  <img
    class="block h-full w-full border border-border-subtle {className}"
    alt="avatar"
    src={gravatarURL(email, gravatarSize)} />
{:else}
  <div
    class="flex h-full w-full items-center justify-center border border-border-subtle bg-border-brand font-semibold text-text-on-brand {className} select-none">
    {initial}
  </div>
{/if}

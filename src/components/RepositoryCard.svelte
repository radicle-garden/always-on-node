<script lang="ts">
  import { Card } from "$lib/components/ui/card";
  import { timeAgo, truncateText } from "$lib/utils";

  import type { RepoInfo } from "../routes/[handle]/+page.server";

  import { copyToClipboard } from "./CopyableText.svelte";
  import Icon from "./Icon.svelte";

  let { repo }: { repo: RepoInfo } = $props();
</script>

<Card class="h-full">
  {#if repo.syncing}
    <div class="flex h-full flex-col justify-between gap-6">
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-between">
          <div
            class="max-w-80 truncate font-medium text-muted-foreground md:max-w-60 lg:max-w-80">
            Syncing...
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <Icon name="seedling" />
          </div>
        </div>
        <div class="flex flex-col gap-0 text-sm">
          <div class="flex font-mono font-semibold text-radicle-blue">
            <button
              class="hover:underline"
              onclick={e => {
                e.stopPropagation();
                e.preventDefault();
                copyToClipboard(repo.rid);
              }}>
              {truncateText(repo.rid, 6)}
            </button>
          </div>
          <div class="line-clamp-3 text-muted-foreground">
            Repository data is being fetched from the network
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex h-full flex-col justify-between gap-6">
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-between">
          <div class="max-w-80 truncate font-medium md:max-w-60 lg:max-w-80">
            {repo.name || "Untitled"}
          </div>
          <div class="flex items-center gap-2">
            <Icon name="seedling-filled" />
            {repo.seeding}
          </div>
        </div>
        <div class="flex flex-col gap-0 text-sm">
          <div class="flex font-mono font-semibold text-radicle-blue">
            <button
              class="hover:underline"
              onclick={e => {
                e.stopPropagation();
                e.preventDefault();
                copyToClipboard(repo.rid);
              }}>
              {truncateText(repo.rid, 6)}
            </button>
          </div>
          <div class="line-clamp-3 text-muted-foreground">
            {repo.description || "No description"}
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div
            class="flex items-center gap-2 text-sm font-light text-muted-foreground">
            <div class="flex items-center gap-1">
              <Icon name="issue" />
              {repo.issues.open}
            </div>
            <div class="flex items-center gap-1">
              <Icon name="patch" />
              {repo.patches.open}
            </div>
          </div>
          {#if repo.lastCommit}
            <div class="text-sm font-light text-muted-foreground">
              Updated {timeAgo(new Date(repo.lastCommit.time * 1000), true)} ago
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</Card>

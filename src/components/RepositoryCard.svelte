<script lang="ts">
  import { enhance } from "$app/forms";
  import { Card } from "$lib/components/ui/card";
  import { timeAgo, truncateText } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import type { RepoInfo } from "../routes/[handle]/+page.server";

  import { copyToClipboard } from "./CopyableText.svelte";
  import Icon from "./Icon.svelte";
  import RemoveRepositoryDialog from "./RemoveRepositoryDialog.svelte";
  import RepoAvatar from "./RepoAvatar.svelte";

  let {
    repo,
    nodeHttpdHostPort,
    nodeId,
    showRemoveButton = false,
  }: {
    repo: RepoInfo;
    nodeHttpdHostPort: string;
    nodeId?: string;
    showRemoveButton?: boolean;
  } = $props();

  let formRef: HTMLFormElement | undefined = $state();

  function handleUnseed() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }
</script>

{#if showRemoveButton && nodeId}
  <form
    bind:this={formRef}
    method="POST"
    action="?/unseed"
    use:enhance={() => {
      return async ({ result, update }) => {
        if (result.type === "success") {
          toast.success("Stopped seeding repository");
          await update();
        } else if (result.type === "failure") {
          toast.error(
            (result.data as { error?: string })?.error ||
              "Failed to stop seeding repository",
          );
        }
      };
    }}>
    <input type="hidden" name="nodeId" value={nodeId} />
    <input type="hidden" name="rid" value={repo.rid} />
  </form>
{/if}

<Card class="h-full p-4">
  {#if repo.syncing}
    <div class="flex h-full flex-col justify-between gap-6">
      <div class="flex flex-col gap-2">
        <div class="flex w-full justify-between">
          <div
            class="flex max-w-80 items-center gap-2 truncate font-medium text-muted-foreground md:max-w-60 lg:max-w-80">
            <button
              type="button"
              title="Refresh"
              class="ml-2 rounded p-1 text-muted-foreground hover:text-radicle-blue"
              aria-label="Refresh"
              onclick={() => location.reload()}>
              <Icon name="hourglass" />
            </button>
            Syncing...
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <Icon name="seed" />
            {#if showRemoveButton && nodeId}
              <RemoveRepositoryDialog
                title="Stop Seeding Repository"
                description="Are you sure you want to stop seeding this repository? It will no longer be served from your node."
                onRemove={handleUnseed} />
            {/if}
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
            <div class="flex items-center gap-2">
              <RepoAvatar name={repo.name} rid={repo.rid} styleWidth="2rem" />
              <a
                class="flex items-center gap-1"
                href="https://app.radicle.xyz/nodes/{nodeHttpdHostPort}/{repo.rid}"
                target="_blank">
                {repo.name || "Untitled"}
                <Icon name="open-external" />
              </a>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="seed-filled" />
            {repo.seeding}
            {#if showRemoveButton && nodeId}
              <RemoveRepositoryDialog
                title="Stop Seeding Repository"
                description="Are you sure you want to stop seeding this repository? It will no longer be served from your node."
                onRemove={handleUnseed} />
            {/if}
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

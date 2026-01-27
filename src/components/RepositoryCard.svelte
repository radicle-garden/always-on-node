<script lang="ts">
  import { enhance } from "$app/forms";
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
  import { copyToClipboard, timeAgo, truncateText } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  import ActivityDiagram from "./ActivityDiagram.svelte";
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

<div class="p-4">
  {#if repo.syncing}
    <div class="flex h-full flex-col justify-between gap-6">
      <div class="flex flex-col gap-2">
        <div class="flex w-full">
          <div class="flex items-center gap-2">
            <Skeleton class="h-6 w-6 bg-surface-subtle" />
            <Skeleton class="h-6 w-26.5 bg-surface-subtle" />
          </div>
          <div class="text-muted-foreground ml-auto flex items-center gap-2">
            {#if showRemoveButton && nodeId}
              <RemoveRepositoryDialog
                title="Unseed repo"
                description="Are you sure you want to unseed this repository? This will remove it from your Garden."
                {repo}
                {nodeHttpdHostPort}
                {nodeId}
                onRemove={handleUnseed} />
            {/if}
          </div>
        </div>
        <div class="flex w-full gap-4">
          <div class="flex flex-col text-sm">
            <Skeleton class="h-6 w-58 bg-surface-subtle" />
            <div class="flex font-mono text-text-tertiary">
              <button
                class="hover:underline"
                onclick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  copyToClipboard(repo.rid);
                  toast.success("Copied to clipboard");
                }}>
                {truncateText(repo.rid, 6)}
              </button>
            </div>
          </div>
          <div class="ml-auto">
            <Skeleton class="h-13 w-48.75 bg-surface-subtle" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center">
            <div class="flex items-center gap-2 font-mono text-text-tertiary">
              <Skeleton class="h-6 w-8 bg-surface-subtle" />
              <Skeleton class="h-6 w-8 bg-surface-subtle" />
            </div>
            <Skeleton class="ml-auto h-6 w-26.5 bg-surface-subtle" />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex h-full flex-col justify-between gap-4">
      <div class="flex w-full">
        <div class="max-w-80 truncate font-medium md:max-w-60 lg:max-w-80">
          <div class="flex items-center gap-2">
            <RepoAvatar name={repo.name} rid={repo.rid} styleWidth="2rem" />
            <a
              class="txt-body-l-semibold flex items-center gap-1"
              href="https://app.radicle.xyz/nodes/{nodeHttpdHostPort}/{repo.rid}"
              target="_blank">
              {repo.name || "Untitled"}
            </a>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          {#if showRemoveButton && nodeId}
            <RemoveRepositoryDialog
              title="Unseed repo"
              description="Are you sure you want to unseed this repository? This will remove it from your Garden."
              {repo}
              {nodeHttpdHostPort}
              {nodeId}
              onRemove={handleUnseed} />
          {/if}
        </div>
      </div>
      <div class="flex w-full">
        <div class="flex flex-col text-sm">
          <div class="txt-body-m-regular line-clamp-3">
            {repo.description || "No description"}
          </div>
          <div class="flex font-mono text-text-tertiary">
            <button
              class="hover:underline"
              onclick={e => {
                e.stopPropagation();
                e.preventDefault();
                copyToClipboard(repo.rid);
                toast.success("Copied to clipboard");
              }}>
              {truncateText(repo.rid, 6)}
            </button>
          </div>
        </div>
        <div class="ml-auto">
          {#if repo.activity}
            <ActivityDiagram
              id={repo.rid}
              viewBoxHeight={100}
              styleColor="var(--color-surface-brand-secondary)"
              activity={repo.activity} />
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-mono text-text-tertiary">
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
            <div class="txt-body-m-regular text-text-tertiary">
              Updated {timeAgo(new Date(repo.lastCommit.time * 1000), true)} ago
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

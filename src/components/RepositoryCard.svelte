<script lang="ts">
  import { enhance } from "$app/forms";
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
  import { timeAgo } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  import ActivityDiagram from "./ActivityDiagram.svelte";
  import Icon from "./Icon.svelte";
  import RemoveRepositoryDialog from "./RemoveRepositoryDialog.svelte";
  import RepoAvatar from "./RepoAvatar.svelte";
  import RepoId from "./RepoId.svelte";

  let {
    repo,
    nodeHttpdHostPort,
    nodeId,
    showRemoveButton = false,
    asLink = true,
  }: {
    repo: RepoInfo;
    nodeHttpdHostPort: string;
    nodeId?: string;
    showRemoveButton?: boolean;
    asLink?: boolean;
  } = $props();

  let hover = $state(false);
  let formRef: HTMLFormElement | undefined = $state();
  let activityContainerRef: HTMLDivElement | undefined = $state();
  let activityContainerWidth = $state<number | null>(null);

  $effect(() => {
    if (!activityContainerRef) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        activityContainerWidth = entry.contentRect.width;
      }
    });

    resizeObserver.observe(activityContainerRef);

    return () => {
      resizeObserver.disconnect();
    };
  });

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
          toast.success(`Stopped seeding ${repo.name || "repository"}`);
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
            <Skeleton class="h-6 w-29 bg-surface-subtle md:w-58" />
            <RepoId rid={repo.rid} />
          </div>
          <div class="ml-auto">
            <Skeleton class="h-13 w-24 bg-surface-subtle md:w-48.75" />
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
        <div class="truncate font-medium">
          <div class="flex items-center gap-2">
            <RepoAvatar name={repo.name} rid={repo.rid} styleWidth="2rem" />
            {#if asLink}
              <a
                href={`https://app.radicle.xyz/nodes/${nodeHttpdHostPort}/${repo.rid}`}
                target="_blank"
                class="txt-body-l-semibold flex min-w-0 items-center gap-1 hover:underline"
                onmouseenter={() => (hover = true)}
                onmouseleave={() => (hover = false)}>
                <span class="truncate">{repo.name || "Untitled"}</span>
                {#if hover}
                  <Icon name="open-external" />
                {/if}
              </a>
            {:else}
              <div class="txt-body-l-semibold flex min-w-0 items-center gap-1">
                <span class="truncate">{repo.name || "Untitled"}</span>
              </div>
            {/if}
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
        <div class="flex min-w-1/2 flex-col text-sm sm:min-w-auto">
          <div class="txt-body-m-regular line-clamp-3">
            {repo.description || "No description"}
          </div>
          <div class="flex font-mono text-text-tertiary">
            <RepoId rid={repo.rid} />
          </div>
        </div>
        <div
          class="ml-auto min-w-1/2 sm:min-w-auto"
          bind:this={activityContainerRef}>
          {#if repo.activity}
            <ActivityDiagram
              id={repo.rid}
              viewBoxHeight={100}
              styleColor="var(--color-surface-brand-secondary)"
              activity={repo.activity}
              containerWidth={activityContainerWidth ?? 185} />
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <div
            class="txt-code-regular flex items-center gap-2 font-mono text-text-tertiary">
            <div
              class="flex items-center gap-1"
              title={`${repo.issues.open} issue${repo.issues.open === 1 ? "" : "s"}`}>
              <Icon name="issue" />
              {repo.issues.open}
            </div>
            <div
              class="flex items-center gap-1"
              title={`${repo.patches.open} patch${repo.patches.open === 1 ? "" : "es"}`}>
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

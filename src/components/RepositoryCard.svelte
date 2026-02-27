<script lang="ts">
  import { enhance } from "$app/forms";
  import type { WeeklyActivity } from "$lib/commit";
  import { groupCommitsByWeek } from "$lib/commit";
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte";
  import { Fetcher } from "$lib/http-client/lib/fetcher";
  import { Client } from "$lib/http-client/lib/repo";
  import { absoluteTimestamp, formatTimestamp } from "$lib/utils";

  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  import type { RepoInfo } from "../routes/(dashboard)/dashboard/+page.server";

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
    httpdScheme,
  }: {
    repo: RepoInfo;
    nodeHttpdHostPort: string;
    nodeId?: string;
    showRemoveButton?: boolean;
    asLink?: boolean;
    httpdScheme: string;
  } = $props();

  let httpdHostname = $derived(nodeHttpdHostPort.split(":")[0]);
  let httpdPort = $derived.by(() => {
    const portStr = nodeHttpdHostPort.split(":")[1];
    return portStr ? parseInt(portStr) : 3080;
  });

  let hover = $state(false);
  let formRef: HTMLFormElement | undefined = $state();
  let activityContainerRef: HTMLDivElement | undefined = $state();
  let activityContainerWidth = $state<number | null>(null);
  let isPrivate = $derived(repo.visibility === "private");
  let repoName = $derived(isPrivate ? "Private repo" : repo.name || "Untitled");
  let repoDescription = $derived(repo.description || "No description");
  let repoHref = $derived(
    `https://app.radicle.xyz/nodes/${nodeHttpdHostPort}/${repo.rid}`,
  );

  let fetchedActivity = $state<WeeklyActivity[] | undefined>(undefined);
  let latestCommit = $state<{ time: number; sha: string } | undefined>(
    undefined,
  );

  let shouldFetchActivity = $derived(!isPrivate && !repo.syncing);
  let activityLoading = $derived(shouldFetchActivity && !fetchedActivity);

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

  onMount(() => {
    if (!shouldFetchActivity) return;

    const controller = new AbortController();

    const httpdClient = new Client(
      new Fetcher({
        hostname: httpdHostname,
        port: httpdPort,
        scheme: httpdScheme,
      }),
    );

    httpdClient
      .getActivity(repo.rid, { abort: controller.signal })
      .then(commits => {
        if (!shouldFetchActivity) return;

        if (commits.activity.length > 0 && repo.head) {
          latestCommit = {
            time: commits.activity[0],
            sha: repo.head,
          };
        }

        fetchedActivity = groupCommitsByWeek(commits.activity);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch activity:", err);
        }
      });

    return () => {
      controller.abort();
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
                title="Unseed repository"
                description="Are you sure you want to unseed this repository? This will remove it from your Garden."
                {repo}
                {nodeHttpdHostPort}
                {nodeId}
                onRemove={handleUnseed}
                {httpdScheme} />
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
            {#if isPrivate}
              <div class="flex items-center bg-surface-strong p-1">
                <Icon name="lock" />
              </div>
            {:else}
              <RepoAvatar name={repo.name} rid={repo.rid} styleWidth="2rem" />
            {/if}
            {#if asLink}
              <a
                href={repoHref}
                target="_blank"
                rel="external"
                class="txt-body-l-semibold flex min-w-0 items-center gap-1 hover:underline"
                onmouseenter={() => (hover = true)}
                onmouseleave={() => (hover = false)}>
                <span class="truncate">{repoName}</span>
                {#if hover}
                  <Icon name="open-external" />
                {/if}
              </a>
            {:else}
              <div class="txt-body-l-semibold flex min-w-0 items-center gap-1">
                <span class="truncate">{repoName}</span>
              </div>
            {/if}
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          {#if showRemoveButton && nodeId}
            <RemoveRepositoryDialog
              title="Unseed repository"
              description="Are you sure you want to unseed this repository? This will remove it from your Garden."
              {repo}
              {nodeHttpdHostPort}
              {nodeId}
              onRemove={handleUnseed}
              {httpdScheme} />
          {/if}
        </div>
      </div>
      <div class="flex w-full">
        <div class="flex min-w-1/2 flex-col text-sm sm:min-w-auto">
          {#if !isPrivate}
            <div class="txt-body-m-regular line-clamp-3">
              {repoDescription}
            </div>
          {/if}
          <div class="flex font-mono text-text-tertiary">
            <RepoId rid={repo.rid} />
          </div>
        </div>
        <div
          class="ml-auto min-h-12 min-w-1/2 sm:min-w-auto"
          bind:this={activityContainerRef}>
          {#if !isPrivate && activityLoading}
            <Skeleton class="ml-auto h-12 w-24 bg-surface-subtle md:w-48.75" />
          {:else if !isPrivate && fetchedActivity}
            <ActivityDiagram
              id={repo.rid}
              viewBoxHeight={100}
              styleColor="var(--color-surface-brand-secondary)"
              activity={fetchedActivity}
              containerWidth={activityContainerWidth ?? 185} />
          {/if}
        </div>
      </div>

      {#if !isPrivate}
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div
              class="txt-code-regular flex items-center gap-2 font-mono text-text-tertiary">
              <a
                href={`${repoHref}/issues`}
                target="_blank"
                rel="external"
                class="flex items-center gap-1 hover:underline"
                title={`${repo.issues.open} issue${repo.issues.open === 1 ? "" : "s"}`}>
                <Icon name="issue" />
                {repo.issues.open}
              </a>
              <a
                href={`${repoHref}/patches`}
                target="_blank"
                rel="external"
                class="flex items-center gap-1 hover:underline"
                title={`${repo.patches.open} patch${repo.patches.open === 1 ? "" : "es"}`}>
                <Icon name="patch" />
                {repo.patches.open}
              </a>
            </div>
            {#if activityLoading}
              <Skeleton class="h-4 w-26.5 bg-surface-subtle" />
            {:else if latestCommit}
              <a
                href={`${repoHref}/commits/${latestCommit.sha}`}
                target="_blank"
                rel="external"
                title={absoluteTimestamp(latestCommit.time)}
                class="txt-body-m-regular text-text-tertiary hover:underline">
                Updated {formatTimestamp(latestCommit.time)}
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

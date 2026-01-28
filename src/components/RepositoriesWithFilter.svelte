<script lang="ts">
  import { Input } from "$lib/components/ui/input";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  import Icon from "./Icon.svelte";
  import NewRepositoryDialog from "./NewRepositoryDialog.svelte";
  import RepositoryCard from "./RepositoryCard.svelte";

  let {
    repositories,
    showCreateDialog,
    nodeId,
    nodeHttpdHostPort,
  }: {
    nodeHttpdHostPort: string;
    repositories: RepoInfo[];
    showCreateDialog: boolean;
    nodeId?: string;
  } = $props();

  let filter = $state("");

  let filteredRepositories = $derived(
    filter
      ? repositories.filter(
          repo =>
            repo.name.toLowerCase().includes(filter.toLowerCase()) ||
            repo.description.toLowerCase().includes(filter.toLowerCase()) ||
            repo.rid.toLowerCase().includes(filter.toLowerCase()),
        )
      : repositories,
  );
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <div class="txt-heading-l line-clamp-1 font-medium">Seeded repos</div>
    {#if showCreateDialog && nodeId}
      <div class="flex items-center gap-2">
        <Input
          type="text"
          bind:value={filter}
          placeholder="Filter repos…"
          class="hidden md:block" />
        <NewRepositoryDialog {nodeId} />
      </div>
    {/if}
  </div>
  <div class="flex items-center gap-2 md:hidden">
    <Input type="text" bind:value={filter} placeholder="Filter repos…" />
  </div>
  <div class="flex flex-col">
    {#if filteredRepositories.length === 0}
      <div
        class="flex w-full flex-col items-center justify-center gap-3 border border-border-subtle bg-surface-canvas py-10 text-center">
        <Icon name="seed" />
        <div class="flex flex-col gap-2">
          <div class="txt-heading-m">No repos yet</div>
          <div class="txt-body-m-regular text-text-secondary">
            There aren't any repos in your Garden yet
          </div>
        </div>
      </div>
    {/if}
    {#each filteredRepositories as repo, i (i)}
      {@const r = repo as RepoInfo}
      <div
        class="border-r border-b border-l border-border-subtle bg-surface-canvas first:rounded-t-sm first:border-t last:rounded-b-sm last:border-b">
        <RepositoryCard
          repo={r}
          {nodeHttpdHostPort}
          {nodeId}
          showRemoveButton={showCreateDialog} />
      </div>
    {/each}
  </div>
</div>

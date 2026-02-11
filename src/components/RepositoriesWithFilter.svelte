<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  import Icon from "./Icon.svelte";
  import NewRepositoryDialog from "./NewRepositoryDialog.svelte";
  import RepositoryCard from "./RepositoryCard.svelte";

  let {
    repositories,
    showCreateDialog,
    nodeId,
    showActions,
    nodeHttpdHostPort,
  }: {
    nodeHttpdHostPort: string;
    repositories: RepoInfo[];
    showCreateDialog: boolean;
    showActions: boolean;
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

  function clearFilter() {
    filter = "";
  }
</script>

{#snippet actionRow()}
  <Input type="text" bind:value={filter} placeholder="Filter" class="pr-8" />
  {#if filter}
    <Button
      type="button"
      onclick={clearFilter}
      variant="ghost"
      size="icon"
      class="absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer">
      <Icon name="cross" />
    </Button>
  {/if}
{/snippet}

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-2">
    <div class="txt-heading-l line-clamp-1 font-medium">Repositories</div>
    {#if showCreateDialog && nodeId && showActions}
      <div class="ml-auto flex items-center gap-2">
        <div class="relative hidden md:block">
          {@render actionRow()}
        </div>
        <div>
          <NewRepositoryDialog
            {nodeId}
            existingRids={repositories.map(r => r.rid)} />
        </div>
      </div>
    {/if}
  </div>
  <div class="relative flex items-center gap-2 md:hidden">
    {@render actionRow()}
  </div>
  <div class="flex flex-col">
    {#if filteredRepositories.length === 0}
      <div
        class="flex w-full flex-col items-center justify-center gap-3 border border-border-subtle bg-surface-canvas px-4 py-10 text-center">
        <Icon name="seed" />
        <div class="flex flex-col gap-2">
          {#if filter}
            <div class="txt-heading-m">No repositories</div>
            <div class="txt-body-m-regular text-text-secondary">
              There aren’t any repositories to show
            </div>
            <div class="mt-1">
              <Button onclick={clearFilter}>Clear filter</Button>
            </div>
          {:else}
            <div class="txt-body-m-regular text-text-secondary">
              You haven’t seeded any repositories.
            </div>
            <div>
              <Button
                variant="outline"
                href="https://search.radicle.xyz/"
                target="_blank">
                Explore to find some
                <Icon name="open-external" />
              </Button>
            </div>
          {/if}
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
  {#if filter && filteredRepositories.length > 0}
    <div class="txt-body-m-medium flex items-center justify-center gap-2">
      <!-- prettier-ignore -->
      <span>
        Showing repositories containing “<span class="txt-body-m-semibold">{filter}</span>”
      </span>
      <Button onclick={clearFilter}>Clear filter</Button>
    </div>
  {/if}
</div>

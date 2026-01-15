<script lang="ts">
  import { Button } from "$vendor/shadcn-svelte/button";
  import { Card } from "$vendor/shadcn-svelte/card";
  import { Input } from "$vendor/shadcn-svelte/input";
  import * as Tooltip from "$vendor/shadcn-svelte/tooltip";

  import type { RepoInfo } from "../routes/[handle]/+page.server";

  import Icon from "./Icon.svelte";
  import NewRepositoryDialog from "./NewRepositoryDialog.svelte";
  import RepositoryCard from "./RepositoryCard.svelte";

  let {
    namespace,
    repositories,
    showCreateDialog,
    nodeId,
    nodeHttpdHostPort,
  }: {
    nodeHttpdHostPort: string;
    namespace: string;
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

<Card class="p-4">
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="text-2xl font-medium">{namespace}'s repositories</div>
      {#if showCreateDialog && nodeId}
        <div class="flex items-center gap-2">
          <NewRepositoryDialog {nodeId} />
          <div>
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={0}>
                <Tooltip.Trigger>
                  <div class="col-span-full">
                    <Button disabled><Icon name="git" />Import</Button>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Coming soon!</p>
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        </div>
      {/if}
    </div>
    <div class="flex max-w-md flex-col gap-2">
      <Input
        type="text"
        bind:value={filter}
        placeholder="filter repositories" />
    </div>
    <div class="flex flex-col gap-2">
      {#if filteredRepositories.length === 0}
        <div class="text-sm text-muted-foreground">No repositories found</div>
      {/if}
      {#each filteredRepositories as repo (repo.rid)}
        <RepositoryCard
          {repo}
          {nodeHttpdHostPort}
          {nodeId}
          showRemoveButton={showCreateDialog} />
      {/each}
    </div>
  </div>
</Card>

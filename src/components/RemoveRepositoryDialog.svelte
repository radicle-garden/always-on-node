<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  import RepositoryCard from "./RepositoryCard.svelte";

  let {
    open = $bindable(false),
    title,
    description,
    repo,
    nodeHttpdHostPort,
    nodeId,
    onRemove,
  }: {
    open?: boolean;
    title: string;
    description: string;
    repo: RepoInfo;
    nodeHttpdHostPort: string;
    nodeId?: string;
    onRemove: () => void;
  } = $props();

  let hover = $state(false);

  function handleConfirm() {
    onRemove();
    open = false;
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger>
    <Button
      tabindex={-1}
      variant={repo.syncing ? "warning" : "default"}
      onmouseenter={() => {
        hover = true;
      }}
      onmouseleave={() => {
        hover = false;
      }}>
      {#if hover}
        <Icon name="cross" />
        Unseed
      {:else if repo.syncing}
        <Icon name="hourglass" />
        Fetching…
      {:else}
        <Icon name="seed-filled" />
        Seeding
      {/if}
    </Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content class="min-w-fit">
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>
        {description}
      </AlertDialog.Description>
      <div class="border border-border-subtle">
        <RepositoryCard
          {repo}
          {nodeHttpdHostPort}
          {nodeId}
          showRemoveButton={false} />
      </div>
    </AlertDialog.Header>
    <AlertDialog.Footer class="grid grid-cols-2 gap-2">
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class={[buttonVariants({ variant: "destructive" })]}
        onclick={handleConfirm}>
        Remove Repository
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

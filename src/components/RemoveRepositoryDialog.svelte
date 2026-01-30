<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog";

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

<Dialog.Root bind:open>
  <Dialog.Trigger
    class="flex min-w-30 cursor-pointer justify-end"
    onmouseenter={() => {
      hover = true;
    }}
    onmouseleave={() => {
      hover = false;
    }}>
    <Button
      tabindex={-1}
      variant={repo.syncing ? "warning" : "default"}
      onclick={e => {
        e.stopPropagation();
        e.preventDefault();
        open = true;
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
  </Dialog.Trigger>
  <Dialog.Content class="min-w-fit">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        {description}
      </Dialog.Description>
      <div class="border border-border-subtle">
        <RepositoryCard
          {repo}
          {nodeHttpdHostPort}
          {nodeId}
          showRemoveButton={false}
          asLink={false} />
      </div>
    </Dialog.Header>
    <Dialog.Footer class="grid grid-cols-2 gap-2">
      <Button
        type="button"
        onclick={() => {
          open = false;
        }}>
        Cancel
      </Button>
      <Button
        class={[buttonVariants({ variant: "destructive" })]}
        onclick={handleConfirm}>
        Remove repository
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

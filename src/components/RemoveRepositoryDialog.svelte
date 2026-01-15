<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import * as AlertDialog from "$vendor/shadcn-svelte/alert-dialog";
  import {
    Button,
    buttonVariants,
  } from "$vendor/shadcn-svelte/button/index.js";

  let {
    open = $bindable(false),
    title,
    description,
    onRemove,
  }: {
    open?: boolean;
    title: string;
    description: string;
    onRemove: () => void;
  } = $props();

  function handleConfirm() {
    onRemove();
    open = false;
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger>
    <Button variant="ghost" tabindex={-1}>
      <Icon name="cross" />
    </Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content class="min-w-fit">
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>
        {description}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class={[buttonVariants({ variant: "destructive" })]}
        onclick={handleConfirm}>
        Remove Repository
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

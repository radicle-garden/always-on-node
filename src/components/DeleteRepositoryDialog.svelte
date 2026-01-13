<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";

  let {
    nid,
    rid,
    onDelete,
  }: { nid: string; rid: string; onDelete: () => void } = $props();

  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button variant="destructive">Delete Repository</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete Repository</Dialog.Title>
    </Dialog.Header>
    <Dialog.Description>
      Are you sure you want to delete this repository? You can always add it
      back later.
    </Dialog.Description>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="destructive" onclick={onDelete}>Delete</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

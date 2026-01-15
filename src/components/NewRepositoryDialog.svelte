<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";

  import { toast } from "svelte-sonner";

  import Icon from "./Icon.svelte";

  let { nodeId }: { nodeId: string } = $props();

  let rid = $state("");
  let open = $state(false);
  let isSubmitting = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button variant="outline">
      <Icon name="plus" />
      Seed Repository
    </Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <form
      method="POST"
      action="?/seed"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === "success") {
            toast.success("Repository seeded");
            rid = "";
            open = false;
            await update();
          } else if (result.type === "failure") {
            toast.error(
              (result.data as { error?: string })?.error ||
                "Failed to seed repository",
            );
          }
        };
      }}>
      <Dialog.Header>
        <Dialog.Title>Seed Repository</Dialog.Title>
      </Dialog.Header>
      <Dialog.Description>
        <div class="py-2 text-sm text-muted-foreground">
          Adding a repository here will seed it from your node and make it more
          available to other users on Radicle.
        </div>
        <input type="hidden" name="nodeId" value={nodeId} />
        <Input
          type="text"
          name="rid"
          placeholder="Enter repository ID (rad:...)"
          bind:value={rid} />
      </Dialog.Description>
      <Dialog.Footer>
        <div class="flex w-full items-center justify-between">
          <div>
            <Button
              type="button"
              variant="outline"
              onclick={() => (open = false)}>
              Cancel
            </Button>
          </div>
          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={!rid || isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

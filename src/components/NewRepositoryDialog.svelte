<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { parseRepositoryId, truncateText } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import Icon from "./Icon.svelte";

  let { nodeId, existingRids }: { nodeId: string; existingRids: string[] } =
    $props();

  let rid = $state("");
  let open = $state(false);
  let isSubmitting = $state(false);

  let isDuplicate = $derived.by(() => {
    if (!rid) return false;
    const parsed = parseRepositoryId(rid);
    if (!parsed) return false;
    const normalizedRid = `${parsed.prefix}${parsed.pubkey}`;
    return existingRids.includes(normalizedRid);
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button class="w-max">
      <Icon name="seed" />
      Seed
    </Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <form
      method="POST"
      action="?/seed"
      class="flex flex-col gap-4"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === "success") {
            const seededRid = (result.data as { rid?: string })?.rid;
            rid = "";
            open = false;
            await update();
            if (seededRid) {
              toast.success(
                `Repository ${truncateText(seededRid)} added successfully`,
              );
            }
          } else if (result.type === "failure") {
            toast.error(
              (result.data as { error?: string })?.error ||
                "Failed to seed repository",
            );
          }
        };
      }}>
      <Dialog.Header>
        <Dialog.Title>Seed repo</Dialog.Title>
      </Dialog.Header>
      <Dialog.Description class="flex flex-col gap-4">
        <div class="text-muted-foreground text-sm">
          Adding a repository to your Garden makes it more available to other
          users on Radicle.
        </div>
        <input type="hidden" name="nodeId" value={nodeId} />
        <div class="flex flex-col gap-1">
          <Input
            type="text"
            name="rid"
            placeholder="Enter repository ID (rad:…)"
            bind:value={rid}
            class={isDuplicate ? "border-feedback-error-border" : ""} />
          {#if isDuplicate}
            <div class="text-sm text-feedback-error-text">
              This repository is already seeded
            </div>
          {/if}
        </div>
      </Dialog.Description>
      <Dialog.Footer class="grid grid-cols-2 gap-2">
        <Button
          type="button"
          onclick={() => {
            open = false;
            rid = "";
          }}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!rid || isSubmitting || isDuplicate}>
          {isSubmitting ? "Adding…" : "Add"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

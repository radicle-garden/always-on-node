<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { truncateText } from "$lib/utils";

  import { toast } from "svelte-sonner";

  import Icon from "./Icon.svelte";

  let { nodeId }: { nodeId: string } = $props();

  let rid = $state("");
  let open = $state(false);
  let isSubmitting = $state(false);

  function waitForSeedCompletion(seededRid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(
        `/api/seed-events?rid=${encodeURIComponent(seededRid)}`,
      );

      const cleanup = () => eventSource.close();

      eventSource.addEventListener("seedComplete", async event => {
        console.log("seedComplete", event);
        const data = JSON.parse(event.data);
        cleanup();
        await invalidateAll();
        if (data.success) {
          resolve();
        } else {
          reject(new Error("Sync failed"));
        }
      });

      eventSource.onerror = () => {
        cleanup();
        reject(new Error("Connection lost"));
      };

      setTimeout(() => {
        cleanup();
        reject(new Error("Sync timed out"));
      }, 120000);
    });
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button class="w-max">
      <Icon name="seed" />
      Seed repo
    </Button>
  </Dialog.Trigger>
  <Dialog.Content showCloseButton={false}>
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
              toast.promise(waitForSeedCompletion(seededRid), {
                loading: "Syncing repository…",
                success: () =>
                  `Repository ${truncateText(seededRid)} synced successfully`,
                error: "Failed to sync repository",
              });
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
        <Input
          type="text"
          name="rid"
          placeholder="Enter repository ID (rad:…)"
          bind:value={rid} />
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
        <Button variant="primary" type="submit" disabled={!rid || isSubmitting}>
          {isSubmitting ? "Adding…" : "Add"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

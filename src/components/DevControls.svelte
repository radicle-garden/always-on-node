<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import type { UserProfile } from "$types/app";

  let {
    profile,
    nodeStatuses,
  }: {
    profile: UserProfile;
    nodeStatuses: Record<string, { isRunning: boolean; size?: number }>;
  } = $props();

  type ContainerAction = "create" | "start" | "stop" | "destroy";

  let currentAction = $state<ContainerAction | null>(null);
  let containerActionError = $state<string | null>(null);

  async function handleContainerAction(action: ContainerAction) {
    currentAction = action;
    containerActionError = null;

    try {
      const body: { action: ContainerAction } = {
        action,
      };

      const response = await fetch("/api/dev/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Action failed");
      }

      // Invalidate all data to refresh container status
      await invalidateAll();
      currentAction = null;
    } catch (e) {
      containerActionError =
        e instanceof Error ? e.message : "Something went wrong";
      currentAction = null;
    }
  }
</script>

<Card class="px-4 py-3">
  <div class="flex flex-col gap-4">
    <div class="flex items-center">
      <h3 class="text-lg font-semibold">Dev Controls</h3>
    </div>

    {#if containerActionError}
      <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {containerActionError}
      </div>
    {/if}

    {#if !profile?.nodes || profile.nodes.length === 0}
      <!-- No node exists -->
      <div class="flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">
          No node exists. Create one to start testing.
        </p>
        <Button
          onclick={() => handleContainerAction("create")}
          disabled={currentAction !== null}
          variant="default"
          size="default"
          class="w-fit">
          {currentAction === "create" ? "Creating..." : "Create Node"}
        </Button>
      </div>
    {:else}
      <!-- Node exists -->
      {@const node = profile.nodes[0]}
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <Button
            onclick={() => handleContainerAction("start")}
            disabled={currentAction !== null ||
              nodeStatuses[node.node_id]?.isRunning}
            variant="success"
            size="sm">
            {currentAction === "start" ? "Starting..." : "Start"}
          </Button>

          <Button
            onclick={() => handleContainerAction("stop")}
            disabled={currentAction !== null ||
              !nodeStatuses[node.node_id]?.isRunning}
            variant="secondary"
            size="sm">
            {currentAction === "stop" ? "Stopping..." : "Stop"}
          </Button>

          <Button
            onclick={() => {
              if (
                confirm(
                  "This will permanently delete the node, containers, and Radicle identity. Are you sure?",
                )
              ) {
                handleContainerAction("destroy");
              }
            }}
            disabled={currentAction !== null}
            variant="destructive"
            size="sm">
            {currentAction === "destroy" ? "Destroying..." : "Destroy Node"}
          </Button>
        </div>

        <p class="text-xs text-muted-foreground">
          These controls bypass the subscription flow for development testing.
        </p>
      </div>
    {/if}
  </div>
</Card>

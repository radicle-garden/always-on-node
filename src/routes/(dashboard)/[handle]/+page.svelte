<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import Icon from "$components/Icon.svelte";
  import NodeStorage from "$components/NodeStorage.svelte";
  import RepositoriesWithFilter from "$components/RepositoriesWithFilter.svelte";
  import Throbber from "$components/Throbber.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as nodeEvents from "$lib/nodeEvents";
  import type { UserProfile } from "$types/app";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let profile = $derived(data.profile as UserProfile);
  let isMe = $derived(data.isMe);
  let repositories = $derived(data.repositories);
  let nodeStatuses = $derived(data.nodeStatuses);
  let node = $derived(profile?.nodes[0]);
  let nodeId = $derived(node?.node_id);
  let hasSubscription = $derived(data.subscriptionStatus?.hasSubscription);
  let isCheckoutSuccess = $derived(
    page.url.searchParams.get("checkout") === "success",
  );

  let isWaitingForNode = $derived(isCheckoutSuccess && !nodeId);

  let nodeHttpdHostPort = $derived(
    `${data.user?.handle}.${data.publicServiceHostPort}`,
  );
  let userMaxDiskUsageBytes = $derived(data.userMaxDiskUsageBytes);

  $effect(() => {
    if (!isMe || !isWaitingForNode) return;

    const interval = setInterval(() => {
      invalidateAll();
    }, 5000);

    return () => clearInterval(interval);
  });

  $effect(() => {
    if (!isMe || !nodeId) return;
    const eventSource = new EventSource(
      `/api/events/node-status?nodeId=${encodeURIComponent(nodeId)}`,
    );
    eventSource.addEventListener("statusChange", async () => {
      await invalidateAll();
    });
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  });
  let hasSyncingRepos = $derived(repositories.some(r => r.syncing));

  $effect(() => {
    if (!hasSyncingRepos) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = nodeEvents.subscribe(
      event => {
        const syncingRepo = repositories.find(
          r => r.syncing && r.rid === event.rid,
        );

        if (syncingRepo) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            invalidateAll();
          }, 1000);
        }
      },
      { eventTypes: ["canonicalRefUpdated"] },
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  });
</script>

{#snippet nodeStatus()}
  {#if nodeStatuses[nodeId]?.isRunning && nodeStatuses[nodeId].peers > 0}
    <Badge variant="success">
      <Throbber />
      <span class="txt-body-s-semibold">Online</span>
    </Badge>
  {:else if nodeStatuses[nodeId]?.isBooting || isCheckoutSuccess}
    <Badge variant="warning">
      <Throbber color="var(--color-badge-warning-base)" />
      <span class="txt-body-s-semibold">Booting</span>
    </Badge>
  {:else if nodeStatuses[nodeId]?.isRunning && nodeStatuses[nodeId].peers === 0}
    <Badge variant="warning">
      <Icon name="hourglass" />
      <span class="txt-body-s-semibold">Offline</span>
    </Badge>
  {:else}
    <Badge variant="destructive">
      <Icon name="cross" />
      Offline
    </Badge>
  {/if}
{/snippet}

{#if profile}
  <div class="flex w-full flex-col gap-8">
    {#if !nodeStatuses[nodeId]?.isBooting && nodeStatuses[nodeId]?.isRunning && nodeStatuses[nodeId].peers === 0}
      <Alert.Root variant="warning">
        <Alert.Description class="flex items-start gap-1">
          <div class="mt-0.5">
            <Icon name="guide" />
          </div>
          <!-- prettier-ignore -->
          <div class="block">
            Your node is running but it has no peers. Ask for help in <a
              href="https://radicle.zulipchat.com/"
              target="_blank"
              class="inline-flex items-center gap-1 underline">
              Zulip
            </a>.
          </div>
        </Alert.Description>
      </Alert.Root>
    {/if}
    {#if hasSubscription || isCheckoutSuccess}
      <div class="flex w-full items-start gap-4 sm:items-end">
        <div
          class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div class="txt-heading-xl sm:txt-heading-xxxl">Garden</div>
          {#if (isMe && nodeId && nodeStatuses[nodeId]) || isCheckoutSuccess}
            <div class="mt-2">
              {@render nodeStatus()}
            </div>
          {/if}
        </div>
        <div class="ml-auto">
          <Button
            href={`https://app.radicle.xyz/nodes/${nodeHttpdHostPort}`}
            target="_blank">
            View node
            <Icon name="open-external" />
          </Button>
        </div>
      </div>
      <NodeStorage
        {repositories}
        nodeStatus={nodeStatuses[nodeId]}
        {userMaxDiskUsageBytes} />
    {/if}
  </div>
  <div class="col-span-12 flex w-full flex-col gap-8">
    {#if data.subscriptionStatus?.hasSubscription || isCheckoutSuccess}
      <RepositoriesWithFilter
        {nodeHttpdHostPort}
        {repositories}
        showActions={!nodeStatuses[nodeId]?.isBooting && !isWaitingForNode}
        showCreateDialog={isMe}
        {nodeId} />
    {/if}
  </div>
{:else}
  <div>Loading…</div>
{/if}

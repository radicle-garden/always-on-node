<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import NodeStorage from "$components/NodeStorage.svelte";
  import PaymentSection from "$components/PaymentSection.svelte";
  import RepositoriesWithFilter from "$components/RepositoriesWithFilter.svelte";
  import Throbber from "$components/Throbber.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
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

  let nodeHttpdHostPort = $derived(
    `${data.user?.handle}.${data.publicServiceHostPort}`,
  );
  let userMaxDiskUsageBytes = $derived(data.userMaxDiskUsageBytes);
</script>

{#snippet nodeStatus()}
  {#if nodeStatuses[nodeId].isRunning && nodeStatuses[nodeId].peers > 0}
    <Badge variant="success">
      <Throbber />
      <span class="txt-body-s-semibold">Online</span>
    </Badge>
  {:else if nodeStatuses[nodeId].isBooting}
    <Badge variant="warning">
      <Throbber color="var(--color-badge-warning-base)" />
      <span class="txt-body-s-semibold">Booting</span>
    </Badge>
  {:else if nodeStatuses[nodeId].isRunning && nodeStatuses[nodeId].peers === 0}
    <Badge variant="warning">
      <Icon name="hourglass" />
      <span class="txt-body-s-semibold">Offline - no peers</span>
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
    {#if isMe && data.user?.email_verified}
      <PaymentSection
        subscriptionStatus={data.subscriptionStatus}
        stripePriceId={data.stripePriceId} />
    {/if}
    {#if hasSubscription}
      <div class="flex w-full items-end gap-4">
        <div class="flex items-center gap-2">
          <div class="txt-heading-xxxl">Garden</div>
          {#if isMe && nodeStatuses[nodeId]}
            {@render nodeStatus()}
          {/if}
        </div>
        <div class="ml-auto">
          <Button
            onclick={() => {
              window.open(
                `https://app.radicle.xyz/nodes/${nodeHttpdHostPort}`,
                "_blank",
              );
            }}>
            View node
            <Icon name="open-external" />
          </Button>
        </div>
      </div>
      <NodeStorage
        {node}
        nodeStatus={nodeStatuses[nodeId]}
        {userMaxDiskUsageBytes} />
    {/if}
  </div>
  <div class="col-span-12 flex w-full flex-col gap-8">
    {#if data.subscriptionStatus?.hasSubscription}
      <RepositoriesWithFilter
        {nodeHttpdHostPort}
        {repositories}
        showCreateDialog={isMe}
        {nodeId} />
    {/if}
  </div>
{:else}
  <div>Loading…</div>
{/if}

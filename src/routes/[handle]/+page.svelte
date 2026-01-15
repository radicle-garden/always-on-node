<script lang="ts">
  import CopyableText from "$components/CopyableText.svelte";
  import Icon from "$components/Icon.svelte";
  import Markdown from "$components/Markdown.svelte";
  import RepositoriesWithFilter from "$components/RepositoriesWithFilter.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Card } from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { timeAgo, truncateDid, truncateText, unescapeHtml } from "$lib/utils";
  import type { UserProfile } from "$types/app";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let profile = $derived(data.profile as UserProfile);
  let isMe = $derived(data.isMe);
  let repositories = $derived(data.repositories);
  let nodeStatuses = $derived(data.nodeStatuses);
  let nodeId = $derived(profile?.nodes[0]?.node_id);

  let unescapedDescription = $derived(unescapeHtml(profile?.description ?? ""));
  let nodeHttpdHostPort = $derived(
    `${data.user?.handle}.${data.publicServiceHostPort}`,
  );
  let userMaxDiskUsageBytes = $derived(data.userMaxDiskUsageBytes);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
</script>

{#if profile}
  <div class="grid w-full grid-cols-12 gap-4">
    <div
      class="col-span-12 flex w-full flex-col items-start justify-start gap-2 lg:col-span-2">
      <div class="flex flex-col gap-1 pt-12">
        <div class="flex flex-col">
          <span class="text-2xl font-semibold">{profile.handle}</span>
          <span class="text-sm font-light text-muted-foreground">
            Gardening for {timeAgo(profile.created_at)}
          </span>
        </div>
        {#each profile.nodes as node (node.node_id)}
          <div class="flex items-center gap-2">
            <CopyableText text={node.did}>
              {truncateText(node.did)}
            </CopyableText>
            {#if isMe && nodeStatuses[node.node_id]}
              <Dialog.Root>
                <Dialog.Trigger>
                  {#if nodeStatuses[node.node_id].isRunning}
                    <span class="text-green-500">
                      <Icon name="seedling-filled" />
                    </span>
                  {:else}
                    <span class="text-red-500">
                      <Icon name="seedling" />
                    </span>
                  {/if}
                </Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Your Radicle Garden Node</Dialog.Title>
                    <Dialog.Description>
                      {#if nodeStatuses[node.node_id].isRunning}
                        <a
                          href="https://app.radicle.xyz/nodes/{nodeHttpdHostPort}"
                          target="_blank">
                          {nodeHttpdHostPort}
                        </a>
                        <Badge variant="success">
                          <Icon name="seedling-filled" />
                          Online
                        </Badge>
                      {:else}
                        {nodeHttpdHostPort}
                        <Badge variant="destructive">
                          <Icon name="seedling" />
                          Offline
                        </Badge>
                      {/if}
                      <p>This node is managed by Radicle Garden.</p>
                      <div>
                        To force a connection to this node, you can run
                        <div class="inline-block">
                          <CopyableText
                            text={`rad node connect ${node.node_id}@${node.connect_address}`}>
                            rad node connect {truncateDid(
                              `${node.node_id}@${node.connect_address}`,
                            )}
                          </CopyableText>
                        </div>
                        in a shell where a radicle node is running.
                      </div>
                      {@const diskUsage = nodeStatuses[node.node_id].size}
                      {#if diskUsage !== undefined}
                        <div class="py-4">
                          <div class="mb-1 flex justify-between text-sm">
                            <span>Storage</span>
                            <span>
                              {formatBytes(diskUsage)} /
                              {formatBytes(userMaxDiskUsageBytes)}
                            </span>
                          </div>
                          <div
                            class="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              class="h-full rounded-full bg-success-foreground transition-all"
                              style="width: {Math.min(
                                (diskUsage / userMaxDiskUsageBytes) * 100,
                                100,
                              )}%">
                            </div>
                          </div>
                        </div>
                      {:else}
                        <div class="py-4">
                          <div class="mb-1 flex justify-between text-sm">
                            <span>Storage</span>
                            <span>Couldn't determine disk usage.</span>
                          </div>
                        </div>
                      {/if}
                    </Dialog.Description>
                  </Dialog.Header>
                </Dialog.Content>
              </Dialog.Root>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    <div class="col-span-12 flex w-full flex-col gap-8 pt-8 lg:col-span-8">
      <Card class="px-4 py-2">
        <div class="markdown">
          <Markdown md={unescapedDescription || "Welcome to my profile!"} />
        </div>
      </Card>
      <RepositoriesWithFilter
        {nodeHttpdHostPort}
        namespace={profile.handle}
        {repositories}
        showCreateDialog={isMe}
        {nodeId} />
    </div>
  </div>
{:else}
  <div>Loading...</div>
{/if}

<script lang="ts">
  import type { NodeStatus, PublicNodeInfo } from "$types/app";

  let {
    node,
    nodeStatus,
    userMaxDiskUsageBytes,
  }: {
    node: PublicNodeInfo;
    nodeStatus: NodeStatus;
    userMaxDiskUsageBytes: number;
  } = $props();
  let nodeId = $derived(node?.node_id);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function bytesToPercentage(bytes: number): number {
    return parseFloat(((bytes / userMaxDiskUsageBytes) * 100).toFixed(2));
  }
</script>

{#if node && nodeId && nodeStatus.size !== undefined}
  <div class="flex flex-col gap-2">
    <div
      class="relative h-10 w-full overflow-hidden rounded-lg border border-border-mid bg-surface-canvas">
      <img
        src="/img/bg/storage.png"
        alt="Storage"
        class="absolute top-0 left-0 min-h-full min-w-1 object-cover"
        style="width: {Math.max(
          bytesToPercentage(nodeStatus.size ?? 0),
          1,
        )}%" />
    </div>
    <div class="txt-body-l-semibold flex w-full">
      <span
        class="min-w-fit text-right"
        style="width: {bytesToPercentage(nodeStatus.size ?? 0)}%">
        {formatBytes(nodeStatus.size ?? 0)}
      </span>
      <span class="ml-auto">
        {formatBytes(userMaxDiskUsageBytes)}
      </span>
    </div>
  </div>
  <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
    <div
      class="bg-success-foreground h-full rounded-full transition-all"
      style="width: {Math.min(
        (nodeStatus.size ?? 0 / userMaxDiskUsageBytes) * 100,
        100,
      )}%">
    </div>
  </div>
{:else}
  <div class="py-4">
    <div class="flex justify-between text-sm">
      <span>Storage</span>
      <span>Couldn't determine disk usage.</span>
    </div>
  </div>
{/if}

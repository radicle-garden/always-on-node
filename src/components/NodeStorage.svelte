<script lang="ts">
  import type { NodeStatus } from "$types/app";

  import type { RepoInfo } from "../routes/(dashboard)/[handle]/+page.server";

  let {
    repositories,
    nodeStatus,
    userMaxDiskUsageBytes,
  }: {
    repositories: RepoInfo[];
    nodeStatus: NodeStatus;
    userMaxDiskUsageBytes: number;
  } = $props();

  let size = $derived.by(() => (repositories.length > 0 ? nodeStatus.size : 0));

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

<div class="flex flex-col gap-2">
  <div
    class="relative h-10 w-full overflow-hidden rounded-lg border border-border-mid bg-surface-canvas">
    <img
      src="/img/bg/storage.png"
      alt="Storage"
      class="absolute top-0 left-0 min-h-full object-cover"
      style="width: {Math.round(bytesToPercentage(size ?? 0))}%" />
  </div>
  <div class="txt-body-l-semibold flex w-full">
    <span
      class="min-w-fit text-right"
      style="width: {bytesToPercentage(size ?? 0)}%">
      {formatBytes(size ?? 0)}
    </span>
    <span class="ml-auto">
      {formatBytes(userMaxDiskUsageBytes)}
    </span>
  </div>
</div>
<div class="bg-muted h-2 w-full overflow-hidden rounded-full">
  <div
    class="bg-success-foreground h-full rounded-full transition-all"
    style="width: {Math.min((size ?? 0 / userMaxDiskUsageBytes) * 100, 100)}%">
  </div>
</div>

<script lang="ts">
  type BreadcrumbItem = {
    label: string;
    href?: string;
  };

  let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav class="flex items-center gap-2 text-sm text-muted-foreground">
  {#each items as item, i}
    {#if item.href}
      <a href={item.href} class="!text-white">{item.label}</a>
    {:else}
      <span class="max-w-fill truncate">{item.label}</span>
    {/if}
    {#if i < items.length - 1}
      <span>-</span>
    {/if}
  {/each}
</nav>

<script lang="ts">
  import { type WithElementRef, cn } from "$lib/utils.js";

  import type { HTMLAnchorAttributes } from "svelte/elements";

  import { type BadgeVariant, badgeVariants } from "./badge-variants.js";

  let {
    ref = $bindable(null),
    href,
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant;
  } = $props();
</script>

<svelte:element
  this={href ? "a" : "span"}
  bind:this={ref}
  data-slot="badge"
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}>
  {@render children?.()}
</svelte:element>

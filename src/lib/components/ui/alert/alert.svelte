<script lang="ts">
  import { type WithElementRef, cn } from "$lib/utils.js";

  import type { HTMLAttributes } from "svelte/elements";

  import { type AlertVariant, alertVariants } from "./alert-variants.js";

  let {
    ref = $bindable(null),
    class: className,
    variant = "default",
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    variant?: AlertVariant;
  } = $props();
</script>

<div
  bind:this={ref}
  data-slot="alert"
  class={cn(alertVariants({ variant }), className)}
  {...restProps}
  role="alert">
  {@render children?.()}
</div>

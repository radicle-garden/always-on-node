<script lang="ts">
  import Icon from "$components/Icon.svelte";
  import { type WithoutChild, cn } from "$lib/utils.js";

  import { Accordion as AccordionPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    level = 3,
    children,
    ...restProps
  }: WithoutChild<AccordionPrimitive.TriggerProps> & {
    level?: AccordionPrimitive.HeaderProps["level"];
  } = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
  <AccordionPrimitive.Trigger
    data-slot="accordion-trigger"
    bind:ref
    class={cn(
      "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
      className,
    )}
    {...restProps}>
    {@render children?.()}
    <Icon name="chevron-down" />
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>

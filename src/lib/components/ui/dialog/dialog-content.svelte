<script lang="ts">
  import { type WithoutChildrenOrChild, cn } from "$lib/utils.js";

  import { Dialog as DialogPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";

  import * as Dialog from "./index.js";

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: DialogPrimitive.PortalProps;
    children: Snippet;
  } = $props();
</script>

<Dialog.Portal {...portalProps}>
  <Dialog.Overlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-sm border border-border-subtle bg-surface-canvas p-6 text-text-primary duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
      className,
    )}
    {...restProps}>
    {@render children?.()}
  </DialogPrimitive.Content>
</Dialog.Portal>

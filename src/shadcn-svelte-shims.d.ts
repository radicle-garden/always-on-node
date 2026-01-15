// Shadcn-svelte components do not use tsc.
// As a result, the components fail to build because some types are
// exposed in Svelte TS modules. This workaround allows running tsc
// before build or test.
declare module "*.svelte" {
  import type { Component } from "svelte";

  const component: Component<never>;
  export default component;

  // Allow any named exports from module context
  export const alertVariants: never;
  export type AlertVariant = never;
  export const badgeVariants: never;
  export type BadgeVariant = never;
  export const buttonVariants: never;
  export type ButtonProps = never;
  export type ButtonSize = never;
  export type ButtonVariant = never;
}

<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import Logo from "$components/Logo.svelte";
  import * as Drawer from "$lib/components/ui/drawer";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { gravatarURL } from "$lib/utils";
  import type { User } from "$types/app";

  import Icon from "./Icon.svelte";

  interface Breadcrumb {
    label: string;
    href: string;
  }

  let {
    user,
    breadcrumbs,
    fqdn,
  }: {
    user: User | null;
    breadcrumbs: Breadcrumb[];
    fqdn: string;
  } = $props();

  let isLoggedIn = $derived(user !== null);
  let isMobileMenuOpen = $state(false);
</script>

{#snippet mobileMenu(user: User)}
  <Drawer.Root bind:open={isMobileMenuOpen}>
    <Drawer.Trigger>
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 border border-border-subtle">
          <img
            style:width="2rem"
            alt="gravatar"
            src={gravatarURL(user.email, 128)} />
        </div>
      </div>
    </Drawer.Trigger>
    <Drawer.Content class="p-3 shadow-4">
      <div class="flex flex-col gap-3">
        <div class="flex max-w-73.5 items-center gap-2.5">
          <img
            class="h-16 w-16 border border-border-subtle"
            src={gravatarURL(user.email, 256)}
            alt="gravatar" />
          <div class="flex flex-col gap-1">
            <div class="txt-heading-m line-clamp-1 break-all text-text-primary">
              {user.handle}.{fqdn}
            </div>
            <div
              class="txt-body-s-regular line-clamp-1 break-all text-text-tertiary">
              {user.email}
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <a href={resolve(`/help`)} onclick={() => (isMobileMenuOpen = false)}>
          <div class="flex h-9 items-center gap-1">
            <Icon name="help" />
            Help
          </div>
        </a>
        <a
          href={resolve(`/settings`)}
          onclick={() => (isMobileMenuOpen = false)}>
          <div class="flex h-9 items-center gap-1">
            <Icon name="settings" />
            Settings
          </div>
        </a>
        <form method="POST" action="/logout" use:enhance>
          <button type="submit" class="w-full">
            <div class="flex h-9 items-center gap-1">
              <Icon name="disconnect" />
              Logout
            </div>
          </button>
        </form>
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/snippet}

{#snippet desktopMenu(user: User)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <div class="h-8 w-8 cursor-pointer border border-border-subtle">
        <img
          style:width="2rem"
          alt="gravatar"
          src={gravatarURL(user.email, 128)} />
      </div>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="rounded-sm shadow-4">
      <div class="flex flex-col gap-3">
        <div class="flex max-w-73.5 items-center gap-2.5">
          <img
            class="h-16 w-16 border border-border-subtle"
            src={gravatarURL(user.email, 256)}
            alt="gravatar" />
          <div class="flex flex-col gap-1">
            <div class="txt-heading-m line-clamp-1 break-all text-text-primary">
              {user.handle}.{fqdn}
            </div>
            <div
              class="txt-body-s-regular line-clamp-1 break-all text-text-tertiary">
              {user.email}
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <a href={resolve(`/help`)}>
          <DropdownMenu.Item class="flex h-9 items-center gap-1">
            <Icon name="help" />
            Help
          </DropdownMenu.Item>
        </a>
        <a href={resolve(`/settings`)}>
          <DropdownMenu.Item class="flex h-9 items-center gap-1">
            <Icon name="settings" />
            Settings
          </DropdownMenu.Item>
        </a>
        <form method="POST" action="/logout" use:enhance>
          <button type="submit" class="w-full">
            <DropdownMenu.Item class="flex h-9 items-center gap-1">
              <Icon name="disconnect" />
              Logout
            </DropdownMenu.Item>
          </button>
        </form>
      </div>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

<div class="flex items-center justify-between">
  <div class="flex items-center gap-1.5 text-text-tertiary">
    <a href={resolve("/")}>
      <Logo />
    </a>
    <div>/</div>
    <div class="flex items-center gap-2">
      {#each breadcrumbs as { label }, i (i)}
        <div>
          {label}
        </div>
      {/each}
    </div>
  </div>
  <div class="ml-auto">
    {#if isLoggedIn && user}
      <div class="hidden sm:block">
        {@render desktopMenu(user)}
      </div>
      <div class="block sm:hidden">
        {@render mobileMenu(user)}
      </div>
    {:else}
      <a href={resolve("/login")}>Login</a>
    {/if}
  </div>
</div>

<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import Logo from "$components/Logo.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { gravatarURL } from "$lib/utils";
  import type { User } from "$types/app";

  import Icon from "./Icon.svelte";

  interface Breadcrumb {
    label: string;
    href: string;
  }

  let { user, breadcrumbs }: { user: User | null; breadcrumbs: Breadcrumb[] } =
    $props();

  let isLoggedIn = $derived(user !== null);
</script>

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <a href={resolve(`/${user.handle}`)} class="flex items-center gap-2">
            <div class="h-8 w-8">
              <img
                style:width="2rem"
                alt="gravatar"
                src={gravatarURL(user.email, 128)} />
            </div>
          </a>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <div class="flex flex-col gap-3">
            <div class="flex max-w-73.5 items-center gap-2.5">
              <img
                class="h-16 w-16"
                src={gravatarURL(user.email, 256)}
                alt="gravatar" />
              <div class="flex flex-col gap-1">
                <div class="txt-heading-m line-clamp-1 text-text-primary">
                  {user.handle}.radicle.garden
                </div>
                <div class="txt-body-s-regular text-text-tertiary">
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
    {:else}
      <a href={resolve("/login")}>Login</a>
    {/if}
  </div>
</div>

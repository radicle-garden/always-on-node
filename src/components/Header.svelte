<script lang="ts">
  import { enhance } from "$app/forms";
  import Avatar from "$components/Avatar.svelte";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu";
  import type { User } from "$types/app";

  let { user }: { user: User | null } = $props();

  let isLoggedIn = $derived(user !== null);
</script>

<div class="mx-auto flex min-h-16 justify-between">
  <NavigationMenu.Root>
    <NavigationMenu.List>
      <NavigationMenu.Item>
        <NavigationMenu.Link class="p-0 hover:bg-transparent" tabindex={-1}>
          <a
            href="/"
            class="flex flex-col items-start justify-start md:flex-row md:items-center md:gap-2">
            <img
              src="/img/radicle-logo.svg"
              alt="Radicle"
              class="h-full w-32" />
            <span class="text-2xl font-extrabold text-garden-logo">garden</span>
          </a>
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    </NavigationMenu.List>
  </NavigationMenu.Root>
  <NavigationMenu.Root>
    <NavigationMenu.List>
      {#if isLoggedIn && user}
        <NavigationMenu.Item>
          <NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
            <a href="/{user.handle}" class="flex items-center gap-2">
              <div class="h-8 w-8 border border-white">
                <Avatar alt="Avatar" fallbackText={user.handle.slice(0, 2)} />
              </div>
              {user.handle}
            </a>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <form
            method="POST"
            action="/logout"
            use:enhance
            class="flex items-center">
            <button type="submit" class="logout-link">Logout</button>
          </form>
        </NavigationMenu.Item>
      {:else}
        <NavigationMenu.Item>
          <NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
            <a href="/login">Login</a>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      {/if}
    </NavigationMenu.List>
  </NavigationMenu.Root>
</div>

<style>
  a,
  .logout-link {
    color: var(--foreground);
    background: none;
    border: none;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }
  a:hover,
  .logout-link:hover {
    color: var(--foreground);
    text-decoration: none;
  }
</style>

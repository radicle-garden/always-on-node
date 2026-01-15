<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { gravatarURL } from "$lib/utils";
  import type { User } from "$types/app";
  import * as NavigationMenu from "$vendor/shadcn-svelte/navigation-menu";

  import { setMode, userPrefersMode } from "mode-watcher";

  let { user }: { user: User | null } = $props();

  let isLoggedIn = $derived(user !== null);

  const modes = ["light", "dark", "system"] as const;

  function handleModeChange(newMode: (typeof modes)[number]) {
    setMode(newMode);
  }
</script>

<div class="mx-auto flex min-h-16 justify-between">
  <NavigationMenu.Root>
    <NavigationMenu.List>
      <NavigationMenu.Item>
        <NavigationMenu.Link class="p-0 hover:bg-transparent" tabindex={-1}>
          <a
            href={resolve("/")}
            class="flex flex-col items-start justify-start md:flex-row md:items-center md:gap-2">
            <img
              src="/img/radicle-logo.svg"
              alt="Radicle"
              class="h-full w-32" />
            <span class="text-garden-logo text-2xl font-extrabold">garden</span>
          </a>
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    </NavigationMenu.List>
  </NavigationMenu.Root>
  <NavigationMenu.Root>
    <NavigationMenu.List>
      <NavigationMenu.Item>
        <div class="flex items-center gap-2">
          {#each modes as modeOption (modeOption)}
            <label class="flex cursor-pointer items-center gap-1">
              <input
                type="radio"
                name="theme"
                value={modeOption}
                checked={userPrefersMode.current === modeOption}
                onchange={() => handleModeChange(modeOption)}
                class="cursor-pointer" />
              <span class="text-sm">{modeOption}</span>
            </label>
          {/each}
        </div>
      </NavigationMenu.Item>
      {#if isLoggedIn && user}
        <NavigationMenu.Item>
          <NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
            <a
              href={resolve(`/${user.handle}`)}
              class="flex items-center gap-2">
              <div class="h-8 w-8">
                <img
                  style:width="2rem"
                  alt="gravatar"
                  src={gravatarURL(user.email, 32)} />
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
            <a href={resolve("/login")}>Login</a>
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

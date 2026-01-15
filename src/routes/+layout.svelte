<script lang="ts">
  import Header from "$components/Header.svelte";
  import Icon from "$components/Icon.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import { cn } from "$lib/utils";

  import "../app.css";

  let { children, data } = $props();
</script>

<Toaster />

<div class="layout px-2 py-1">
  <header class="w-full px-2 2xl:w-3/4">
    <Header user={data.user} />
  </header>
  <main class={cn("relative w-full")}>
    <div class="w-full px-2 2xl:w-3/4">
      {@render children()}
    </div>
  </main>
  <footer class="txt-small px-2">
    &copy; {new Date().getFullYear()} Radicle <Icon name="seed" />
  </footer>
</div>

<style>
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  main {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: scroll;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-align: center;
    margin-top: auto;
    padding: 1rem 0;
    color: var(--color-foreground-dim);
  }
</style>

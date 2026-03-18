<script lang="ts">
  import { resolve } from "$app/paths";
  import FAQ from "$components/FAQ.svelte";
  import Icon from "$components/Icon.svelte";
  import { Button } from "$lib/components/ui/button";
</script>

<div class="flex w-full flex-col items-start">
  <div class="txt-heading-xxl sm:txt-heading-xxxl max-w-200 text-left">
    An always-on node for your Radicle repositories.
    <span class="text-text-tertiary">
      The sovereignty of Radicle, with additional availability.
    </span>
  </div>
  <img
    src="/img/landing/garden-hero.png"
    alt="Radicle Garden"
    class="mt-10 h-120 w-full rounded-md object-cover object-center sm:mt-16 sm:h-128" />
  <div class="txt-heading-xl mt-32 max-w-135 sm:mt-24">
    Why run an always‑on node? <span class="text-text-tertiary">
      Stay online, stay replicated, stay in control.
    </span>
  </div>
  <div class="mt-4 sm:mt-4">
    Start free for 7 days, then €4.99/month. Cancel anytime.
  </div>
  <Button class="mt-4 sm:mt-4" variant="primary" href={resolve("/register")}>
    Get one for €4.99/month
  </Button>
  <div class="mt-32 grid grid-cols-1 gap-6 sm:mt-16 md:grid-cols-3">
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/always-reachable.jpg"
        alt="Always reachable"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Always reachable</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Your repositories stay available on a publicly accessible IP, online
          24/7. Reachable even when your machine isn’t.
        </div>
      </div>
    </div>
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/simple-to-set-up.jpg"
        alt="Simple to set up"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Simple to set up</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Get your hosted node up and seeding repositories in minutes. No
          infrastructure to manage.
        </div>
      </div>
    </div>
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/works-alongside-your-local-node.jpg"
        alt="Works alongside your local node"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Works alongside your local node</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Your hosted node syncs with your local setup, so you keep your
          workflow and sovereignty while gaining availability.
        </div>
      </div>
    </div>
  </div>
  <div
    class="relative mt-32 h-102 w-full rounded-md bg-[url('/img/landing/radicle-hero.jpg')] bg-cover bg-center p-6 md:mt-24 md:bg-position-[center_right_-10rem]">
    <div class="flex h-full flex-col">
      <div
        class="txt-heading-l md:txt-heading-xxl text-text-on-brand md:max-w-128">
        Radicle is an open source, peer-to-peer code collaboration stack built
        on Git.
      </div>
      <div
        class="mt-auto flex w-full flex-col gap-4 md:flex-row md:items-end md:gap-0">
        <div
          class="txt-body-l-medium md:txt-body-m-medium max-w-100 text-text-on-brand">
          Get started in minutes—no servers required. Instantly share code and
          discover new projects.
        </div>
        <div class="md:ml-auto">
          <Button
            class="radicle-cta !font-bold"
            target="_blank"
            href="https://radicle.dev">
            Visit radicle.dev<Icon name="open-external" />
          </Button>
        </div>
      </div>
    </div>
  </div>
  <div class="mt-48 w-full">
    <FAQ />
  </div>
</div>

<style>
  :global(.radicle-cta) {
    background: white !important;
    color: black !important;
  }

  :global(.radicle-cta:hover) {
    background: black !important;
    color: white !important;
  }
</style>

<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "$components/Icon.svelte";
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
</script>

<div class="flex w-full flex-col items-start">
  <div class="txt-heading-xxl sm:txt-heading-xxxl max-w-200 text-left">
    An always-on node for your Radicle repos. <span class="text-text-tertiary">
      The sovereignty of Radicle, with additional availability.
    </span>
  </div>
  <img
    src="/img/landing/hero.png"
    alt="Radicle Garden"
    class="mt-10 h-120 w-full object-cover object-top-left sm:mt-16 sm:h-128" />
  <div class="txt-heading-xl mt-32 max-w-135 sm:mt-24">
    Why run an always‑on node? <span class="text-text-tertiary">
      Stay online, stay replicated, stay in control.
    </span>
  </div>
  <div class="mt-8 sm:mt-16">
    Start free for 7 days, then $5/month. Cancel anytime.
  </div>
  <Button class="mt-8 sm:mt-16" variant="primary" href={resolve("/register")}>
    Get one for $5/month
  </Button>
  <div class="mt-32 grid grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-3">
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/always-reachable.png"
        alt="Always reachable"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Always reachable</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Your repos stay available on a publicly accessible IP, online 24/7.
          Reachable even when your machine isn't.
        </div>
      </div>
    </div>
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/simple-to-set-up.png"
        alt="Simple to set up"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Simple to set up</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Connect your repos in minutes. No infrastructure to manage.
        </div>
      </div>
    </div>
    <div class="col-span-1 flex flex-col gap-5">
      <img
        src="/img/landing/works-alongside-your-local-node.png"
        alt="Works alongside your local node"
        class="h-66.5 w-full rounded-md object-cover" />
      <div>
        <div class="txt-body-l-semibold">Works alongside your local node</div>
        <div class="txt-body-l-medium pr-10 text-text-tertiary">
          Your hosted node syncs with your local setup, so you keep your
          workflow and sovereignty and gain availability.
        </div>
      </div>
    </div>
  </div>
  <div
    class="relative mt-32 h-102 w-full rounded-md bg-[url('/img/landing/container-xs.png')] bg-cover bg-center p-6 sm:mt-24 sm:bg-[url('/img/landing/container.png')]">
    <div class="flex h-full flex-col">
      <div class="txt-heading-l sm:txt-heading-xxl text-[black] sm:max-w-128">
        Radicle is an open source, peer-to-peer code collaboration stack built
        on Git unlike centralized code hosting platforms.
      </div>
      <div
        class="mt-auto flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:gap-0">
        <div
          class="txt-body-l-medium sm:txt-body-m-medium max-w-100 text-[black]">
          Get started in minutes—no servers required. Instantly share code and
          discover new projects.
        </div>
        <div class="sm:ml-auto">
          <Button
            class="bg-[white] font-bold text-[black]"
            target="_blank"
            href="https://radicle.xyz">
            Visit radicle.xyz<Icon name="open-external" />
          </Button>
        </div>
      </div>
    </div>
  </div>
  <div class="mt-48 w-full">
    <div class="txt-heading-xxl">
      FAQ.
      <div class="block text-text-tertiary sm:inline">
        Answers to common questions.
      </div>
    </div>
    <div class="mt-16 w-full">
      <Accordion.Root type="single">
        <Accordion.Item value="item-1">
          <Accordion.Trigger>
            <div class="txt-heading-m">
              How does this work with my local node?
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular">
              You sync with a garden node like you would with any other public
              seed node.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-2">
          <Accordion.Trigger>
            <div class="txt-heading-m">Where is my data stored?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular">On our servers.</div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-3">
          <Accordion.Trigger>
            <div class="txt-heading-m">What about private repos?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular">Coming soon.</div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-4">
          <Accordion.Trigger>
            <div class="txt-heading-m">
              Are there limits on repos or storage?
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular">Yes. You get 5GB of storage.</div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  </div>
</div>

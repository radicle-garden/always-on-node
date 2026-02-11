<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "$components/Icon.svelte";
  import * as Accordion from "$lib/components/ui/accordion";
  import { Button } from "$lib/components/ui/button";
</script>

<div class="flex w-full flex-col items-start">
  <div class="txt-heading-xxl sm:txt-heading-xxxl max-w-200 text-left">
    An always-on node for your Radicle repositories. <span
      class="text-text-tertiary">
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
    Start free for 7 days, then €4.99/month. Cancel anytime.
  </div>
  <Button class="mt-8 sm:mt-16" variant="primary" href={resolve("/register")}>
    Get one for €4.99/month
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
          Your repositories stay available on a publicly accessible IP, online
          24/7. Reachable even when your machine isn’t.
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
          Get your hosted node up and seeding repositories in minutes. No
          infrastructure to manage.
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
          workflow and sovereignty while gaining availability.
        </div>
      </div>
    </div>
  </div>
  <div
    class="relative mt-32 h-102 w-full rounded-md bg-[url('/img/landing/container-xs.png')] bg-cover bg-center p-6 sm:mt-24 sm:bg-[url('/img/landing/container.png')] sm:bg-position-[center_right_-10rem]">
    <div class="flex h-full flex-col">
      <div class="txt-heading-l sm:txt-heading-xxl text-[black] sm:max-w-128">
        Radicle is an open source, peer-to-peer code collaboration stack built
        on Git.
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
            <div class="txt-body-m-regular max-w-176">
              Your identity and personal node remain fully sovereign. Garden
              provides an additional node that replicates the repositories you
              care about, so even if other public nodes stop replicating them,
              your projects stay available. Think of it as an extra layer of
              availability — not a replacement for your node.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-2">
          <Accordion.Trigger>
            <div class="txt-heading-m">
              Who is the team providing this service?
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <!-- prettier-ignore -->
            <div class="txt-body-m-regular max-w-176">
              Garden is built by many long-time Radicle contributors. The
              service and its operating entity are fully owned by
              <a href="https://betterinternet.foundation/" target="_blank" class="underline">The Better Internet Foundation</a>,
              which is the Swiss non-profit that oversees the development of the Radicle Protocol.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-3">
          <Accordion.Trigger>
            <div class="txt-heading-m">Who runs a Garden node?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular max-w-176">
              We operate a managed Radicle node on your behalf, hosted on
              Scaleway infrastructure. The repositories you choose to replicate
              are stored there.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-4">
          <Accordion.Trigger>
            <div class="txt-heading-m">What about private repositories?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular max-w-176">
              The Radicle protocol already lets you collaborate in a private,
              peer-to-peer way. If you add a Garden node to your repository's
              allowlist, we'll replicate that repository too. However, since
              Radicle repositories are not currently encrypted at rest, the
              operators of the Garden service may be able to access your
              content. We plan on working on encryption at rest.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-5">
          <Accordion.Trigger>
            <div class="txt-heading-m">
              Are there limits on repositories or storage?
            </div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular max-w-176">
              Yes. Each account comes with 5 GB of storage. If you need more, <a
                href="https://radicle.zulipchat.com/"
                class="underline"
                target="_blank">
                reach out to us
              </a>
              and we can discuss a custom option.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-6">
          <Accordion.Trigger>
            <div class="txt-heading-m">What about CI?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular max-w-176">
              Radicle CI is actively in development, and we plan to add support
              for it, including a hosted version.
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="item-7">
          <Accordion.Trigger>
            <div class="txt-heading-m">Can I pay anonymously?</div>
          </Accordion.Trigger>
          <Accordion.Content>
            <div class="txt-body-m-regular max-w-176">
              Not yet, but we get it and we plan on working on adding anonymous
              payment options in the future, so you can use Garden without tying
              your identity to a payment method.
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  </div>
</div>

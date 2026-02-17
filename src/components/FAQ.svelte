<script lang="ts">
  import * as Accordion from "$lib/components/ui/accordion";
</script>

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
        <div class="txt-heading-m">How does this work with my local node?</div>
      </Accordion.Trigger>
      <Accordion.Content>
        <div class="txt-body-m-regular max-w-176">
          Your identity and personal node remain fully sovereign. Garden
          provides an additional node that replicates the repositories you care
          about, so even if other public nodes stop replicating them, your
          projects stay available. Think of it as an extra layer of availability
          — not a replacement for your node.
        </div>
      </Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Trigger>
        <div class="txt-heading-m">Who is the team providing this service?</div>
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
          We operate a managed Radicle node on your behalf, hosted on Scaleway
          infrastructure. The repositories you choose to replicate are stored
          there.
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
          allowlist, we'll replicate that repository too. However, since Radicle
          repositories are not currently encrypted at rest, the operators of the
          Garden service may be able to access your content. We plan on working
          on encryption at rest.
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
          Radicle CI is actively in development, and we plan to add support for
          it, including a hosted version.
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

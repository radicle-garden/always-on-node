<script lang="ts">
  import Command from "$components/Command.svelte";
  import Icon from "$components/Icon.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let user = $derived(data.user);
  let nodeId = $derived(user?.nodes[0]?.node_id);
</script>

<div class="flex flex-col gap-8">
  <div class="txt-heading-xxl">Help</div>
  <div class="grid grid-cols-1 grid-rows-2 gap-8 sm:grid-cols-2 sm:grid-rows-1">
    <div class="flex flex-col gap-8 rounded-sm bg-surface-subtle p-6">
      <div class="flex flex-col gap-2">
        <div class="txt-heading-m">Support</div>
        <div class="txt-body-m-regular text-text-tertiary">
          Get answers from our community or share your thoughts on Zulip.
        </div>
      </div>
      <a
        href="https://radicle.zulipchat.com/"
        target="_blank"
        class="flex items-center gap-2 font-bold text-brand-hover">
        Open Zulip
        <Icon name="arrow-right" />
      </a>
    </div>
    <div class="flex flex-col gap-8 rounded-sm bg-surface-subtle p-6">
      <div class="flex flex-col gap-2">
        <div class="txt-heading-m">Feedback</div>
        <div class="txt-body-m-regular text-text-tertiary">
          Feel free to send us an email with any feedback or further enquiries.
        </div>
      </div>
      <a
        href="mailto:support@radicle.garden"
        target="_blank"
        class="flex items-center gap-2 font-bold text-brand-hover">
        Get in touch
        <Icon name="arrow-right" />
      </a>
    </div>
  </div>
  {#if nodeId}
    <div class="flex flex-col gap-4">
      <div class="txt-heading-m">Seeding private repositories</div>
      <div class="txt-body-m-regular">
        To seed a private repository, you need to add your Always On Node to the
        repository's allowlist.
      </div>
      <div class="txt-body-m-regular">1. Copy your Always On Node's ID:</div>
      <div class="w-fit">
        <Command cmd={user?.nodes[0].node_id ?? ""} />
      </div>
      <div class="txt-body-m-regular">
        2. Add it to the repository's allowlist:
      </div>
      <div class="w-fit">
        <Command cmd={`rad id --allow ${user?.nodes[0].node_id ?? ""}`} />
      </div>
      <div class="txt-body-m-regular">3. Sync changes</div>
      <div class="w-fit">
        <Command cmd="rad sync" />
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <div class="txt-heading-m">Configure local node</div>
      <div class="txt-body-m-regular">
        Add your Always On Node as a preferred seed for faster access to your
        repositories.
      </div>
      <div class="w-fit">
        <Command
          cmd={`rad config push preferredSeeds ${user?.nodes[0].node_id ?? ""}@${user?.nodes[0].connect_address ?? ""}`} />
      </div>
    </div>
  {/if}
</div>

<script lang="ts">
  import { resolve } from "$app/paths";
  import Icon from "$components/Icon.svelte";
</script>

<div class="mt-24 grid w-full grid-cols-2 gap-8 sm:grid-cols-4">
  <div class="col-span-1 flex flex-col gap-3">
    <div class="txt-heading-xs text-text-tertiary">Guides</div>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/guides/user"
      target="_blank">
      User guide
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/guides/protocol"
      target="_blank">
      Protocol guide
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/guides/seeder"
      target="_blank">
      Seeder guide
    </a>
  </div>
  <div class="col-span-1 flex flex-col gap-3">
    <div class="txt-heading-xs text-text-tertiary">Resources</div>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/faq"
      target="_blank">
      FAQ
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/#updates"
      target="_blank">
      Updates
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.xyz/#blog"
      target="_blank">
      Blog
    </a>
  </div>
  <div class="col-span-1 flex flex-col gap-3">
    <div class="txt-heading-xs text-text-tertiary">Social</div>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://bsky.app/profile/radicle.xyz"
      target="_blank">
      Bluesky
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://twitter.com/radicle"
      target="_blank">
      Twitter
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://toot.radicle.xyz/@radicle"
      target="_blank">
      Mastodon
    </a>
  </div>
  <div class="col-span-1 flex flex-col gap-3">
    <div class="txt-heading-xs text-text-tertiary">Community</div>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://radicle.zulipchat.com/"
      target="_blank">
      Zulip
    </a>
    <a
      class="txt-body-m-medium hover:underline"
      href="https://community.radworks.org"
      target="_blank">
      Forum
    </a>
  </div>
</div>
<div class="txt-body-m-medium mt-24 w-full text-left text-text-tertiary">
  Want to learn more about Radicle, the sovereign forge? Visit <a
    href="https://radicle.xyz"
    target="_blank"
    class="inline-flex items-center gap-1 underline">
    radicle.xyz<Icon name="open-external" />
  </a>
</div>
<div class="txt-body-m-medium mt-6 w-full text-left text-text-tertiary">
  <div class="flex items-center gap-6">
    <div>© {new Date().getFullYear()} The Radicle Team</div>
    <a href={resolve("/terms")} class="underline">Terms of Service</a>
    <a href={resolve("/privacy")} class="underline">Privacy Policy</a>
  </div>
</div>

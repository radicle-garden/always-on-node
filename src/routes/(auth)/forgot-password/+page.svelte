<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import LogoText from "$components/LogoText.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);
  let isResending = $state(false);
  let resendSuccess = $state(false);
  let email = $derived(form?.email ?? "");
</script>

<div class="w-full bg-surface-canvas p-8 sm:w-100">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <div>
      <LogoText />
    </div>
    <div>
      Back to <a href={resolve("/login")} class="underline">log in</a>
    </div>
    <div class="txt-heading-xxl">Reset password</div>
    {#if form?.success}
      <div>
        We’ve sent a reset link to <span class="font-bold">
          {form?.email}
        </span>
      </div>
      <div>
        Click the link in the email to reset your password. If you don’t see it,
        check your spam folder.
      </div>
      <form
        method="POST"
        action="?/resend"
        use:enhance={() => {
          isResending = true;
          return async ({ update, result }) => {
            await update();
            isResending = false;
            if (result.type === "success") {
              resendSuccess = true;
              setTimeout(() => {
                resendSuccess = false;
              }, 5000);
            }
          };
        }}
        class="flex w-full flex-col gap-4">
        <input type="hidden" name="email" value={form?.email} />
        <div class="flex items-center gap-4">
          Didn’t receive it?
          <Button
            variant="primary"
            type="submit"
            disabled={isResending || resendSuccess}>
            {#if resendSuccess}
              Email sent!
            {:else}
              {isResending ? "Sending…" : "Resend email"}
            {/if}
          </Button>
        </div>
        {#if form?.resendError}
          <p class="text-sm text-feedback-error-text">{form.resendError}</p>
        {/if}
      </form>
    {:else}
      <form
        method="POST"
        action="?/send"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}
        class="flex w-full flex-col gap-8">
        <div class="grid gap-2">
          <Label for="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@example.com"
            class="border"
            bind:value={email}
            aria-invalid={!!form?.errors?.email}
            required />
          {#if form?.errors?.email}
            <p class="text-sm text-feedback-error-text">{form.errors.email}</p>
          {/if}
        </div>
        {#if form?.errors?.general}
          <div class="text-destructive text-sm">{form.errors.general}</div>
        {/if}
        <div class="flex w-full items-center">
          <div class="ml-auto">
            <Button
              type="submit"
              disabled={isSubmitting || !email}
              variant="primary">
              {isSubmitting ? "Sending…" : "Send me a link"}
            </Button>
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>

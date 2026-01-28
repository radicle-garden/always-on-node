<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import LogoText from "$components/LogoText.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);
  let dialogOpen = $state(false);
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
    <form
      method="POST"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
      class="flex w-full flex-col gap-8">
      {#if form?.success}
        <div>
          We've sent a reset link to <span class="font-bold">
            {form?.email}
          </span>
        </div>
        <div>
          Click the link in the email to reset your password. If you don't see
          it, check your spam folder.
        </div>
        <div class="flex items-center gap-4">
          Didn't receive it?
          <AlertDialog.Root bind:open={dialogOpen}>
            <AlertDialog.Trigger>
              <Button
                variant="primary"
                onclick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  dialogOpen = true;
                }}>
                Resend email
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Not implemented</AlertDialog.Title>
              <AlertDialog.Description>
                This feature is not yet available.
              </AlertDialog.Description>
              <AlertDialog.Footer>
                <AlertDialog.Cancel>
                  <Button
                    onclick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      dialogOpen = false;
                    }}>
                    Ok
                  </Button>
                </AlertDialog.Cancel>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </div>
      {:else}
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
      {/if}
      {#if !form?.success}
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
      {/if}
    </form>
  </div>
</div>

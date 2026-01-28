<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import LogoText from "$components/LogoText.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);
</script>

<div
  class="flex w-full flex-col items-center justify-center bg-surface-canvas p-8 sm:w-100">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <LogoText />
    <div class="txt-heading-xxl">Set new password</div>
    <div class="txt-body-l-regular">
      Or <a href={resolve("/login")} class="underline">log in</a>
      to your existing account
    </div>
  </div>
  <form
    method="POST"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
    class="flex w-full max-w-sm flex-col gap-6">
    <div class="grid gap-2">
      <Label for="password">New password</Label>
      <Input
        id="password"
        name="password"
        type="password"
        class="border"
        aria-invalid={!!form?.errors?.password}
        required
        placeholder="******" />
      {#if form?.errors?.password}
        <p class="text-sm text-feedback-error-text">{form.errors.password}</p>
      {/if}
    </div>
    <div class="grid gap-2">
      <Label for="confirmPassword">Confirm new password</Label>
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        class="border"
        aria-invalid={!!form?.errors?.confirmPassword}
        required
        placeholder="******" />
      {#if form?.errors?.confirmPassword}
        <p class="text-sm text-feedback-error-text">
          {form.errors.confirmPassword}
        </p>
      {/if}
    </div>
    {#if form?.errors?.general}
      <div class="text-sm text-feedback-error-text">{form.errors.general}</div>
    {/if}
    <div class="flex w-full items-center">
      <div class="ml-auto">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Resetting…" : "Reset password"}
        </Button>
      </div>
    </div>
  </form>
</div>

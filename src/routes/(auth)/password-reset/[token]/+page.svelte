<script lang="ts">
  import { enhance } from "$app/forms";
  import LogoText from "$components/LogoText.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);
</script>

<div
  class="flex w-[400px] flex-col items-center justify-center gap-8 bg-surface-canvas p-8">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <LogoText />
    <div class="txt-heading-xxl">Set new password</div>
    <div class="txt-body-l-regular">Enter your new password below.</div>
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
        <p class="text-destructive text-sm">{form.errors.password}</p>
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
        <p class="text-destructive text-sm">
          {form.errors.confirmPassword}
        </p>
      {/if}
    </div>
    {#if form?.errors?.general}
      <Alert.Root variant="destructive">
        <Alert.Title>Unable to reset password</Alert.Title>
        <Alert.Description>{form.errors.general}</Alert.Description>
      </Alert.Root>
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

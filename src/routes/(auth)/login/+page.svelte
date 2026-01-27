<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import LogoText from "$components/LogoText.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);

  const verified = page.url.searchParams.get("verified");
  const pwReset = page.url.searchParams.get("pw-reset");
</script>

<div
  class="flex w-[400px] flex-col items-center justify-center bg-surface-canvas p-8">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <LogoText />
    <div class="txt-heading-xxl">
      {#if verified === "true"}
        Email verified
      {:else if pwReset === "success"}
        Password reset
      {:else if pwReset === "invalid"}
        Invalid reset link
      {:else}
        Log in
      {/if}
    </div>
    <div class="txt-body-l-regular">
      {#if verified === "true"}
        You can now log in with your email and password.
      {:else if pwReset === "success"}
        You can now log in with your new password.
      {:else if pwReset === "invalid"}
        This password reset link is invalid or has expired. Please request a new
        one.
      {:else}
        Or <a href={resolve("/register")} class="underline">
          create your account
        </a>
      {/if}
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
        <Label for="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="email@example.com"
          class="border"
          value={form?.email ?? ""}
          aria-invalid={!!form?.errors?.email}
          required />
        {#if form?.errors?.email}
          <div class="text-destructive text-sm">{form.errors.email}</div>
        {/if}
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between">
          <Label for="password">Password</Label>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          class="border"
          aria-invalid={!!form?.errors?.password}
          required
          placeholder="******" />
        {#if form?.errors?.password}
          <div class="text-destructive text-sm">{form.errors.password}</div>
        {/if}
        <a
          href={resolve("/forgot-password")}
          class="text-sm underline-offset-4 hover:underline">
          Forgot password?
        </a>
        {#if form?.errors?.general}
          <Alert.Root variant="destructive">
            <Alert.Title>Unable to login</Alert.Title>
            <Alert.Description>{form.errors.general}</Alert.Description>
          </Alert.Root>
        {/if}
      </div>
      <div class="flex w-full items-center">
        <div class="ml-auto">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </div>
      </div>
    </form>
  </div>
</div>

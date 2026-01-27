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

<div class="w-[400px] bg-surface-canvas p-8">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <div>
      <LogoText />
    </div>
    {#if form?.success}
      <div class="txt-heading-xxl">Check your email</div>
      <div>
        We've sent a verification link to <span class="font-bold">
          {form?.email}
        </span>
      </div>
      <div>
        Click the link in the email to verify your account. If you don't see it,
        check your spam folder.
      </div>
      <div class="flex items-center gap-4">
        Didn't receive it?
        <Button
          onclick={() => {
            window.location.reload();
          }}>
          Resend email
        </Button>
      </div>
      <div class="txt-body-l-regular">
        Already verified? <a href={resolve("/login")} class="underline">
          Log in
        </a>
      </div>
    {:else}
      <div class="txt-heading-xxl">Create your account</div>
      <div class="txt-body-l-regular">
        Or <a href={resolve("/login")} class="underline">log in</a>
        to your existing account
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
        class="w-full">
        <div class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="handle">Username (cannot be changed!)</Label>
            <Input
              id="handle"
              name="handle"
              type="text"
              placeholder="username"
              class="border"
              value={form?.handle ?? ""}
              aria-invalid={!!form?.errors?.handle}
              required />
            {#if form?.errors?.handle}
              <p class="text-destructive text-sm">{form.errors.handle}</p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              class="border"
              placeholder="email@example.com"
              value={form?.email ?? ""}
              aria-invalid={!!form?.errors?.email}
              required />
            {#if form?.errors?.email}
              <p class="text-destructive text-sm">{form.errors.email}</p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              class="border"
              aria-invalid={!!form?.errors?.password}
              required
              placeholder="************" />
            {#if form?.errors?.password}
              <p class="text-destructive text-sm">{form.errors.password}</p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              class="border"
              aria-invalid={!!form?.errors?.confirmPassword}
              required
              placeholder="************" />
            {#if form?.errors?.confirmPassword}
              <p class="text-destructive text-sm">
                {form.errors.confirmPassword}
              </p>
            {/if}
          </div>
          {#if form?.errors?.general}
            <div>
              Unable to create account: {form.errors.general}
            </div>
          {/if}
          {#if form?.errors?.terms}
            <p class="text-destructive text-sm">{form.errors.terms}</p>
          {/if}
          <div class="flex w-full items-center">
            <div class="flex items-center gap-1">
              <input type="checkbox" id="terms" name="terms" required />
              <Label for="terms">
                I accept the <a href={resolve("/terms")} class="underline">
                  Terms of Service
                </a>
              </Label>
            </div>
            <div class="ml-auto">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing up…" : "Sign up"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>

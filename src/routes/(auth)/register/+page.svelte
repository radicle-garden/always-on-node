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
  let handle = $derived(form?.handle ?? "");
  let email = $derived(form?.email ?? "");
  let password = $state("");
  let confirmPassword = $state("");
  let termsAccepted = $state(false);
</script>

<div
  class="flex w-full flex-col items-center justify-center bg-surface-canvas p-8 sm:w-100">
  <div class="flex h-full w-full flex-col items-start justify-start gap-8">
    <div>
      <LogoText />
    </div>
    {#if form?.success}
      <div class="txt-heading-xxl">Check your email</div>
      <div>
        We’ve sent a verification link to <span class="font-bold">
          {form?.email}
        </span>
      </div>
      <div>
        Click the link in the email to verify your account. If you don’t see it,
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
        class="flex items-center gap-4">
        <input type="hidden" name="email" value={form?.email} />
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
      </form>
      {#if form?.resendError}
        <p class="text-sm text-feedback-error-text">{form.resendError}</p>
      {/if}
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
        action="?/register"
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
            <Label for="handle" class="flex w-full flex-col items-start">
              <div>Username</div>
            </Label>
            <Input
              id="handle"
              name="handle"
              type="text"
              placeholder="username"
              class="border"
              bind:value={handle}
              aria-invalid={!!form?.errors?.handle}
              required />
            <div class="text-sm text-text-quarternary">
              This can’t be changed
            </div>
            {#if form?.errors?.handle}
              <p class="text-sm text-feedback-error-text">
                {form.errors.handle}
              </p>
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
              bind:value={email}
              aria-invalid={!!form?.errors?.email}
              required />
            {#if form?.errors?.email}
              <p class="text-sm text-feedback-error-text">
                {form.errors.email}
              </p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              class="border"
              bind:value={password}
              aria-invalid={!!form?.errors?.password}
              required
              placeholder="************" />
            {#if form?.errors?.password}
              <p class="text-sm text-feedback-error-text">
                {form.errors.password}
              </p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              class="border"
              bind:value={confirmPassword}
              aria-invalid={!!form?.errors?.confirmPassword}
              required
              placeholder="************" />
            {#if form?.errors?.confirmPassword}
              <p class="text-sm text-feedback-error-text">
                {form.errors.confirmPassword}
              </p>
            {/if}
          </div>
          {#if form?.errors?.general}
            <div class="text-sm text-feedback-error-text">
              {form.errors.general}
            </div>
          {/if}
          {#if form?.errors?.terms}
            <p class="text-sm text-feedback-error-text">{form.errors.terms}</p>
          {/if}
          <div class="flex w-full items-center">
            <div class="flex items-center gap-1">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                bind:checked={termsAccepted}
                required />
              <Label for="terms" class="flex items-center gap-1">
                <div>I accept the</div>
                <a href={resolve("/terms")} class="underline">
                  Terms of Service
                </a>
              </Label>
            </div>
            <div class="ml-auto">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting ||
                  !handle ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  !termsAccepted}>
                {isSubmitting ? "Signing up…" : "Sign up"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>

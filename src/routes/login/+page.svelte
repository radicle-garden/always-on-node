<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);

  const verified = page.url.searchParams.get("verified");
  const registered = page.url.searchParams.get("registered");
  const pwReset = page.url.searchParams.get("pw-reset");

  const message = $derived.by(() => {
    if (registered === "true") {
      return {
        title: "Account created",
        body: "Please check your email for a verification link",
        status: "success" as const,
      };
    }
    if (verified === "true") {
      return {
        title: "Email verified",
        body: "You can now login",
        status: "success" as const,
      };
    } else if (verified === "false") {
      return {
        title: "Email could not be verified",
        body: "Please try again or contact support",
        contactSupport: true,
        status: "destructive" as const,
      };
    }
    if (pwReset === "success") {
      return {
        title: "Password reset",
        body: "Your password has been reset. You can now login with your new password.",
        status: "success" as const,
      };
    } else if (pwReset === "invalid") {
      return {
        title: "Invalid reset link",
        body: "This password reset link is invalid or has expired. Please request a new one.",
        status: "destructive" as const,
      };
    }
    return null;
  });
</script>

<div class="flex h-screen flex-col items-center justify-center">
  <form
    method="POST"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
    class="w-full max-w-sm">
    <Card.Root class="py-8">
      <Card.Header>
        <Card.Title>Login to your account</Card.Title>
        <Card.Description>
          Enter your email below to login to your account
        </Card.Description>
        {#if message}
          <Alert.Root variant={message.status || "default"}>
            <Alert.Title>{message.title}</Alert.Title>
            <Alert.Description>{message.body}</Alert.Description>
            {#if message.contactSupport}
              <Alert.Description>
                <div class="flex flex-row items-center gap-1">
                  Please contact support
                  <a
                    href="https://radicle.zulipchat.com/#narrow/channel/369873-support"
                    target="_blank">
                    on Zulip.
                  </a>
                </div>
              </Alert.Description>
            {/if}
          </Alert.Root>
        {/if}
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col gap-6">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
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
              <div class="text-sm text-destructive">{form.errors.email}</div>
            {/if}
          </div>
          <div class="grid gap-2">
            <div class="flex items-center justify-between">
              <Label for="password">Password</Label>
              <a
                href="/forgot-password"
                class="text-sm underline-offset-4 hover:underline">
                Forgot password?
              </a>
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
              <div class="text-sm text-destructive">{form.errors.password}</div>
            {/if}
          </div>
          {#if form?.errors?.general}
            <Alert.Root variant="destructive">
              <Alert.Title>Unable to login</Alert.Title>
              <Alert.Description>{form.errors.general}</Alert.Description>
            </Alert.Root>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex-col gap-2">
        <Button class="w-full" type="submit" disabled={isSubmitting}>
          Login
        </Button>
        {#if isSubmitting}
          <p>Logging in...</p>
        {/if}
        <a href="/register">Or create an account</a>
      </Card.Footer>
    </Card.Root>
  </form>
</div>

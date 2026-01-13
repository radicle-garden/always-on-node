<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";

  let { form } = $props();

  let isSubmitting = $state(false);
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
        <Card.Title>Reset your password</Card.Title>
        <Card.Description>
          Enter your email address and we'll send you a link to reset your
          password
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col gap-6">
          {#if form?.success}
            <Alert.Root variant="default">
              <Alert.Title>Check your email</Alert.Title>
              <Alert.Description>
                If an account exists with this email, you will receive a
                password reset link shortly.
              </Alert.Description>
            </Alert.Root>
          {:else}
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
                <p class="text-sm text-destructive">{form.errors.email}</p>
              {/if}
            </div>
            {#if form?.errors?.general}
              <Alert.Root variant="destructive">
                <Alert.Title>Unable to send reset email</Alert.Title>
                <Alert.Description>{form.errors.general}</Alert.Description>
              </Alert.Root>
            {/if}
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex-col gap-2">
        {#if !form?.success}
          <Button class="w-full" type="submit" disabled={isSubmitting}>
            Send reset link
          </Button>
          {#if isSubmitting}
            <p>Sending...</p>
          {/if}
        {/if}
        <a href="/login">Back to login</a>
      </Card.Footer>
    </Card.Root>
  </form>
</div>

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
        <Card.Title>Create an account</Card.Title>
        <Card.Description>
          Enter your details below to create an account
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col gap-6">
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
              <p class="text-sm text-destructive">{form.errors.handle}</p>
            {/if}
          </div>
          <div class="grid gap-2">
            <Label for="email">Email</Label>
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
              <p class="text-sm text-destructive">{form.errors.email}</p>
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
              placeholder="******" />
            {#if form?.errors?.password}
              <p class="text-sm text-destructive">{form.errors.password}</p>
            {/if}
          </div>
          {#if form?.errors?.general}
            <Alert.Root variant="destructive">
              <Alert.Title>Unable to create account</Alert.Title>
              <Alert.Description>{form.errors.general}</Alert.Description>
            </Alert.Root>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex-col gap-2">
        <Button class="w-full" type="submit" disabled={isSubmitting}>
          Create account
        </Button>
        {#if isSubmitting}
          <p>Creating account...</p>
        {/if}
        <a href="/login">Or login to an existing account</a>
      </Card.Footer>
    </Card.Root>
  </form>
</div>

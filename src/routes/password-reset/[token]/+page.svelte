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
        <Card.Title>Set new password</Card.Title>
        <Card.Description>Enter your new password below</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col gap-6">
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
              <p class="text-sm text-destructive">{form.errors.password}</p>
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
              <p class="text-sm text-destructive">
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
        </div>
      </Card.Content>
      <Card.Footer class="flex-col gap-2">
        <Button class="w-full" type="submit" disabled={isSubmitting}>
          Reset password
        </Button>
        {#if isSubmitting}
          <p>Resetting...</p>
        {/if}
      </Card.Footer>
    </Card.Root>
  </form>
</div>

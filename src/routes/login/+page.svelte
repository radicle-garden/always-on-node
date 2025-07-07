<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { login } from '$lib/auth';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { user } from '$lib/state';
	import {
		validateEmail,
		createFormValidator,
		hasFormErrors
	} from '$lib/utils';

	// If the user is already logged in, redirect to the profile
	if ($user) goto(`/${$user.handle}`);

	// Form state
	let email = $state('');
	let password = $state('');
	let isLoggingIn = $state(false);
	let errors = $state<Record<string, string>>({});

	const { message } = page.state as {
		message?: {
			title: string;
			body: string;
			contactSupport?: boolean;
			status: 'success' | 'destructive';
		};
	};

	// Validation schema
	const validateLoginForm = createFormValidator({
		email: (value: string) => {
			if (!value.trim()) return 'Email is required';
			if (!validateEmail(value)) return 'Invalid email address';
			return null;
		},
		password: (value: string) => {
			if (!value) return 'Password is required';
			return null;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		errors = validateLoginForm({ email, password });

		if (hasFormErrors(errors)) {
			return;
		}

		isLoggingIn = true;

		try {
			const { success, error, user } = await login(email, password);
			if (success) {
				goto(`/${user!.handle}`);
			} else {
				errors.general = error as string;
			}
		} catch (error) {
			errors.general = error as string;
		} finally {
			isLoggingIn = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-sm">
	<Card.Root>
		<Card.Header>
			<Card.Title>Login to your account</Card.Title>
			<Card.Description
				>Enter your email below to login to your account</Card.Description
			>
			{#if message}
				<Alert.Root variant={message.status || 'default'}>
					<Alert.Title>{message.title}</Alert.Title>
					<Alert.Description>{message.body}</Alert.Description>
					{#if message.contactSupport}
						<Alert.Description>
							<div class="flex flex-row items-center gap-1">
								Please contact support
								<a
									href="https://radicle.zulipchat.com/#narrow/channel/369873-support"
									target="_blank">on Zulip.</a
								>
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
						type="email"
						placeholder="email@example.com"
						bind:value={email}
						aria-invalid={!!errors.email}
						required
					/>
					{#if errors.email}
						<div class="text-sm text-destructive">{errors.email}</div>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						aria-invalid={!!errors.password}
						required
						placeholder="******"
					/>
					{#if errors.password}
						<div class="text-sm text-destructive">{errors.password}</div>
					{/if}
				</div>
				{#if errors.general}
					<Alert.Root variant="destructive">
						<Alert.Title>Unable to login</Alert.Title>
						<Alert.Description>{errors.general}</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</Card.Content>
		<Card.Footer class="flex-col gap-2">
			<Button class="w-full" type="submit" disabled={isLoggingIn}>Login</Button>
			{#if isLoggingIn}
				<p>Logging in...</p>
			{/if}
			<a href="/register">Or create an account</a>
		</Card.Footer>
	</Card.Root>
</form>

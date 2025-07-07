<script lang="ts">
	import { goto } from '$app/navigation';

	import { api } from '$lib/api';
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
	let handle = $state('');
	let email = $state('');
	let password = $state('');
	let isRegistering = $state(false);
	let errors = $state<Record<string, string>>({});

	// Validation schema
	const validateRegisterForm = createFormValidator({
		handle: (value: string) => {
			if (!value.trim()) return 'Username is required';
			return null;
		},
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

		errors = validateRegisterForm({ handle, email, password });

		if (hasFormErrors(errors)) {
			return;
		}

		isRegistering = true;

		try {
			const response = await api.signup(handle, email, password);
			if (response.success) {
				goto('/login', {
					state: {
						message: {
							title: 'Account Created',
							body: 'Please check your email for a verification link',
							status: 'success'
						}
					}
				});
			} else {
				// If our client-side validation fails to catch an issue and the server
				// returns a list of validation errors, we handle that here.
				type SignupValidationError = {
					msg: string;
				};
				errors.general = (response.error as SignupValidationError[])
					?.map((e: SignupValidationError) => e.msg)
					.join(', ') as string;
			}
		} catch (error) {
			errors.general = error as string;
		} finally {
			isRegistering = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-sm">
	<Card.Root>
		<Card.Header>
			<Card.Title>Create an account</Card.Title>
			<Card.Description
				>Enter your details below to create an account</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-6">
				<div class="grid gap-2">
					<Label for="handle">Username (cannot be changed!)</Label>
					<Input
						id="handle"
						type="text"
						placeholder="username"
						bind:value={handle}
						aria-invalid={!!errors.handle}
						required
					/>
					{#if errors.handle}
						<p class="text-sm text-destructive">{errors.handle}</p>
					{/if}
				</div>
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
						<p class="text-sm text-destructive">{errors.email}</p>
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
						<p class="text-sm text-destructive">{errors.password}</p>
					{/if}
				</div>
				{#if errors.general}
					<Alert.Root variant="destructive">
						<Alert.Title>Unable to create account</Alert.Title>
						<Alert.Description>{errors.general}</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</Card.Content>
		<Card.Footer class="flex-col gap-2">
			<Button class="w-full" type="submit" disabled={isRegistering}
				>Create account</Button
			>
			{#if isRegistering}
				<p>Creating account...</p>
			{/if}
			<a href="/login">Or login to an existing account</a>
		</Card.Footer>
	</Card.Root>
</form>

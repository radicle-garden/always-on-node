<script lang="ts">
	import { goto } from '$app/navigation';

	import { api } from '$lib/api';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { user } from '$lib/state';
	import { validateEmail } from '$lib/utils';

	// If the user is already logged in, redirect to the profile
	if ($user) goto(`/${$user.handle}`);

	let errors = $state<string[]>([]);
	let isRegistering = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isRegistering = true;

		const handle = (document.getElementById('handle') as HTMLInputElement)
			.value;
		const email = (document.getElementById('email') as HTMLInputElement).value;
		const password = (document.getElementById('password') as HTMLInputElement)
			.value;

		errors = [];
		if (!handle) {
			errors.push('Username is required');
		}
		if (email && !validateEmail(email)) {
			errors.push('Invalid email address');
		}
		if (!email) {
			errors.push('Email is required');
		}
		if (!password) {
			errors.push('Password is required');
		}

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
				throw response.error;
			}
		} catch (error) {
			console.error(error);
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
					<Input id="handle" type="text" placeholder="username" required />
				</div>
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="email@example.com"
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" required placeholder="******" />
				</div>
				{#if errors.length > 0}
					<Alert.Root variant="destructive">
						<Alert.Title>Unable to login</Alert.Title>
						<Alert.Description>
							<ul class="list-inside list-disc text-sm">
								{#each errors as error}
									<li>{error}</li>
								{/each}
							</ul>
						</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</Card.Content>
		<Card.Footer class="flex-col gap-2">
			<Button
				class="w-full"
				type="submit"
				onclick={handleSubmit}
				disabled={isRegistering}>Create account</Button
			>
			{#if isRegistering}
				<p>Creating account...</p>
			{/if}
			<a href="/login">Or login to an existing account</a>
		</Card.Footer>
	</Card.Root>
</form>

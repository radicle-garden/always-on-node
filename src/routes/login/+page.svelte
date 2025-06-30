<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { login } from '$lib/auth';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { validateEmail } from '$lib/utils';

	let errors = $state<string[]>([]);
	let isLoggingIn = $state(false);
	const { message } = page.state as {
		message?: {
			title: string;
			body: string;
			contactSupport?: boolean;
			status: 'success' | 'destructive';
		};
	};

	const handleSubmit = async (event: Event) => {
		event.preventDefault();
		isLoggingIn = true;
		const email = (document.getElementById('email') as HTMLInputElement).value;
		const password = (document.getElementById('password') as HTMLInputElement)
			.value;

		errors = [];
		if (!email) {
			errors.push('Email is required');
		}
		if (!validateEmail(email)) {
			errors.push('Invalid email address');
		}
		if (!password) {
			errors.push('Password is required');
		}

		if (errors.length > 0) {
			return;
		}

		try {
			const { success, error, user } = await login(email, password);
			if (success) {
				goto(`/${user!.handle}`);
			} else {
				throw error;
			}
		} catch (error) {
			console.error(error);
			errors.push(`Check your email and password`);
		} finally {
			isLoggingIn = false;
		}
	};
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
				disabled={isLoggingIn}>Login</Button
			>
			{#if isLoggingIn}
				<p>Logging in...</p>
			{/if}
			<a href="/register">Or create an account</a>
		</Card.Footer>
	</Card.Root>
</form>

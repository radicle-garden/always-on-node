<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { api } from '$lib/api';

	const { token } = page.params;

	// Make a request to the API to verify the email
	onMount(async () => {
		try {
			const response = await api.verifyEmail(token);
			if (response.statusCode === 200) {
				goto('/login', {
					state: {
						message: {
							title: 'Email verified',
							body: 'You can now login',
							status: 'success'
						}
					}
				});
			} else {
				throw new Error('Email could not be verified');
			}
		} catch (error) {
			goto('/login', {
				state: {
					message: {
						title: 'Email could not be verified',
						contactSupport: true,
						status: 'destructive'
					}
				}
			});
		}
	});
</script>

<div>Verifying email...</div>

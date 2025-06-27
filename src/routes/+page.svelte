<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { initialiseUser } from '$lib/auth';

	/* For now, if the user is not logged in, let's redirect to the login page */

	onMount(async () => {
		const user = await initialiseUser();
		if (!user) {
			goto('/login');
		} else {
			goto('/garden');
		}
	});
</script>

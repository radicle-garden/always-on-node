<script lang="ts">
	import { logout } from '$lib/auth';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import { isLoggedIn, user } from '$lib/state';

	import Avatar from '$components/Avatar.svelte';
</script>

<div class="mx-auto flex max-w-screen-2xl justify-between">
	<NavigationMenu.Root>
		<NavigationMenu.List>
			<NavigationMenu.Item>
				<NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
					<a href="/">
						<img src="/img/radicle-logo.svg" alt="Radicle" class="h-8 w-full" />
						Garden
					</a>
				</NavigationMenu.Link>
			</NavigationMenu.Item>
		</NavigationMenu.List>
	</NavigationMenu.Root>
	<NavigationMenu.Root>
		<NavigationMenu.List>
			{#if $isLoggedIn && $user}
				<NavigationMenu.Item>
					<NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
						<a href="/{$user?.handle}" class="flex items-center gap-2">
							<div class="h-8 w-8">
								<Avatar
									src={$user?.avatar_img}
									alt="Avatar"
									fallbackText={$user?.handle.slice(0, 2)}
								/>
							</div>
							{$user?.handle}
						</a>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
						<a href="/garden">Garden</a>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
						<a href="/" onclick={logout}>Logout</a>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			{:else}
				<NavigationMenu.Item>
					<NavigationMenu.Link class="hover:bg-transparent" tabindex={-1}>
						<a href="/login">Login</a>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			{/if}
		</NavigationMenu.List>
	</NavigationMenu.Root>
</div>

<style>
	a {
		color: var(--foreground);
	}
	a:hover {
		color: var(--foreground);
	}
	a:hover:no-underline {
		text-decoration: none;
	}
</style>

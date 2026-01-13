import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		watch: {
			usePolling: true,
			interval: 1000
		},
		host: '0.0.0.0'
	}
});

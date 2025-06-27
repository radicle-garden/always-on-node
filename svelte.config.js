import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'app.html'
		}),
		alias: {
			$components: './src/components',
			$types: './src/types'
		}
	}
};

export default config;

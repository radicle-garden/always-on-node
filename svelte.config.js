import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: true
	},
	kit: {
		adapter: adapter({
			fallback: 'app.html'
		}),
		alias: {
			$components: './src/components',
			$types: './src/types',
			'@http-client': './http-client'
		}
	}
};

export default config;

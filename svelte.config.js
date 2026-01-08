import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: true
	},
	kit: {
		adapter: adapter(),
		alias: {
			$components: './src/components',
			$types: './src/types',
			'@http-client': './http-client'
		}
	}
};

export default config;

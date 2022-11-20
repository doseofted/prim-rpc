// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
	// NOTE: until/unless React allows more control, keep this disabled except when debugging
	// LINK: https://github.com/facebook/react/issues/16362
	reactStrictMode: false,
	swcMinify: true,
	webpack(given) {
		/** @type {import("webpack").Configuration} */
		const config = given
		// ...
		return config
	},
}

export default nextConfig

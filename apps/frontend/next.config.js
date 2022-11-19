// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	webpack(given) {
		/** @type {import("webpack").Configuration} */
		const config = given
		// ...
		return config
	},
}

export default nextConfig

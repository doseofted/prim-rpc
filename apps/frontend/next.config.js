// @ts-check
import unocss from "unocss/webpack"

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	webpack(given) {
		/** @type {import("webpack").Configuration} */
		const config = given
		config?.plugins?.push(unocss())
		if (config.optimization?.realContentHash) {
			config.optimization.realContentHash = true
		}
		return config
	},
}

export default nextConfig

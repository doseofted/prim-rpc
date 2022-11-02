// @ts-check
import { defineConfig } from "tsup"
import { copyFile, readdir } from "node:fs/promises"
import { existsSync as exists } from "node:fs"
import { join as joinPath } from "node:path"


export default defineConfig(options => ({
	...options,
	entry: [
		// TODO: entries need to separated into their own packages since packageJson.exports won't be a useful setting any time soon
		"src/server/fastify.ts",
		"src/server/express.ts",
		"src/server/ws.ts",
		"src/client/axios.ts",
		"src/client/browser-api.ts",
	],
	target: "ES2020",
	dts: true,
	sourcemap: true,
	format: ["esm"],
	clean: true,
	async onSuccess() {
		const dirname = new URL(".", import.meta.url).pathname
		const paths = [joinPath(dirname, "dist/client"), joinPath(dirname, "dist/server")]
		// NOTE: ensure that .mjs import in typescript >=4.7 can be used from plugin package with types
		/** @type {(declaration: string) => Promise<void>} */
		const renameDeclaration = async declaration => {
			if (!exists(declaration)) { return }
			const newFileName = declaration.replace(/\.d\.ts$/, ".d.mts")
			await copyFile(declaration, newFileName)
			console.log("Renamed", declaration, "->", newFileName)
		}
		for (const path of paths) {
			const given = await readdir(path)
			for (const filename of given) {
				if (filename.endsWith(".d.ts")) {
					const declaration = joinPath(path, filename)
					await renameDeclaration(declaration)
				}
			}
		}
	},
}))

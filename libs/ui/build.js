import { $, argv } from "zx"
import { watch } from "chokidar"
import { debounce } from "lodash-es"
import path from "node:path"

const runMitosis = async (_event = "none", path) => {
	if (!(typeof path === "undefined" || path.endsWith(".lite.tsx"))) {
		return
	}
	await $`pnpm mitosis build --config mitosis.config.cjs`
}
await runMitosis()

if (argv.watch || argv.dev) {
	console.log("Watching for changes ...")
	const srcCode = path.join(path.dirname(new URL(import.meta.url).pathname), "src")
	const watcher = watch(srcCode, { ignored: /node_modules/, ignoreInitial: true })
	watcher.on("all", debounce(runMitosis, 500))
	if (argv.dev) {
		await $`pnpm vite:dev`
	} else {
		await $`pnpm vite:watch`
	}
} else {
	await $`pnpm vite:build`
}

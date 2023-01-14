import { createUnplugin } from "unplugin"

interface BuildOptions {
	/** Folder name, relative to project folder that should not be imported */
	name: string
	/** Enable console logs for imports to determine what name option should be used */
	debug?: boolean
}

export default createUnplugin((options: BuildOptions = { name: "" }) => ({
	name: "unplugin-prim-prevent-import",
	transformInclude: id => {
		const matches = id.startsWith(options.name)
		if (options.debug) console.log((matches ? "matc:" : "no match:").padEnd(10), id)
		return matches
	},
	transform: () => "export {};",
}))

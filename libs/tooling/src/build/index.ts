import { createUnplugin } from "unplugin"

interface BuildOptions {
	/** Folder name, relative to project folder that should not be imported */
	name: string
}

export default createUnplugin((options: BuildOptions = { name: "" }) => ({
	name: "prim-prevent-import",
	transformInclude: id => id.startsWith(__dirname + options.name),
	transform: () => "export {};",
}))

// @ts-check
import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
	externals: ["@doseofted/prim-rpc", "axios", "ws", "express", "fastify", "@fastify/multipart", "mitt", "type-fest"],
})

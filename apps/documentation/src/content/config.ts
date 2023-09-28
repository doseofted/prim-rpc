import { defineCollection, z } from "astro:content"

const documentationCollection = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		order: z.number().optional(),
		description: z.string().optional(),
	}),
})

const pluginsCollection = defineCollection({
	type: "content",
	schema: z.object({
		name: z.string(),
		icon: z.string().optional(),
		type: z.enum(["method-handler", "method-plugin", "callback-handler", "callback-plugin", "json-handler"]),
		transport: z.enum(["http", "ws"]),
		features: z.array(z.string()).optional(),
	}),
})

const apiCollection = defineCollection({
	type: "data",
})

export const collections = {
	docs: documentationCollection,
	plugins: pluginsCollection,
	api: apiCollection,
}

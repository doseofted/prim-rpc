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
	}),
})

export const collections = {
	docs: documentationCollection,
	plugins: pluginsCollection,
}

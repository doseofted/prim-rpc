import { defineCollection, z } from "astro:content"

const documentationCollection = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		order: z.number().optional(),
		description: z.string().optional(),
	}),
})

export const collections = {
	docs: documentationCollection,
}

import { defineCollection, type getCollection, z } from "astro:content"

export interface TableOfContentsSection {
	name: string
	link?: string
	sections?: TableOfContentsSection[]
}
export type TableOfContents = TableOfContentsSection[]

export const versionsAvailable = [{
	name: "v0",
	aliases: ["latest"],
	available: true,
}]
export const latestVersion = "v0"
export const documentationCollections = ["docs", "plugins"] as const

/** Table of Contents for Documentation pages */
export const documentationContents = (collection = "docs", version: `v${string}` = latestVersion): TableOfContents => [
	{
		version: "v0",
		content: [
			{
				name: "Library Usage",
				sections: [
					{ name: "Introduction", link: `/${collection}/${version}/usage/introduction` },
					{ name: "Setup", link: `/${collection}/${version}/usage/setup` },
					{ name: "How to Use", link: `/${collection}/${version}/usage/how-to-use` },
					{ name: "Examples", link: `/${collection}/${version}/usage/examples` },
					{ name: "Security", link: `/${collection}/${version}/usage/security` },
					{ name: "Limitations", link: `/${collection}/${version}/usage/limitations` },
				],
			}
		]
	},
	{
		version: "v1",
		content: []
	}
].find(v => v.version === version)?.content ?? []

const pluginTypes = z.enum(["method-handler", "method-plugin", "callback-handler", "callback-plugin", "json-handler"])
export type PluginType = z.infer<typeof pluginTypes>

export type DocumentationCollection = typeof documentationCollections[number]
export type CollectionType<C extends DocumentationCollection> = Awaited<ReturnType<typeof getCollection<C>>>[number]

export const collections = {
	docs: defineCollection({
		type: "content",
		schema: z.object({
			title: z.string(),
			order: z.number().optional(),
			description: z.string().optional(),
		}),
	}),
	plugins: defineCollection({
		type: "content",
		schema: z.object({
			title: z.string(),
			order: z.number().optional(),
			icon: z.string().optional(),
			type: pluginTypes,
			transport: z.enum(["http", "ws"]),
			features: z.array(z.string()).optional(),
		}),
	}),
	api: defineCollection({
		type: "data",
	})
}

import { defineCollection, type getCollection, z } from "astro:content"

export interface TableOfContentsSection {
	name: string
	link?: string
	sections?: TableOfContentsSection[]
}
export type TableOfContents = TableOfContentsSection[]

export const versionsAvailable = [
	{
		name: "v0",
		aliases: ["latest"],
		available: true,
	},
]
export const latestVersion = "v0"
export const documentationCollections = ["docs", "plugins"] as const

/** Table of Contents for Documentation pages */
export const documentationContents = (collection = "docs", version: `v${string}` = latestVersion): TableOfContents =>
	[
		{
			version: "v0",
			content: [
				{
					name: "Learning",
					sections: [
						{ name: "Introduction", link: `/${collection}/${version}/learn/intro` },
						{ name: "Setup", link: `/${collection}/${version}/learn/setup` },
						{ name: "Advanced", link: `/${collection}/${version}/learn/advanced` },
						{ name: "Examples", link: `/${collection}/${version}/learn/examples` },
						{ name: "Security", link: `/${collection}/${version}/learn/security` },
						{ name: "Limitations", link: `/${collection}/${version}/learn/limitations` },
					],
				},
				{
					name: "Reference",
					sections: [
						{ name: "Configuration", link: `/${collection}/${version}/reference/config` },
						{ name: "Browse Plugins", link: `/${collection}/${version}/reference/plugins` },
						{ name: "Create Plugin", link: `/${collection}/${version}/reference/create` },
						{ name: "Structure", link: `/${collection}/${version}/reference/structure` },
					],
				},
				{
					name: "Tooling",
					sections: [
						{ name: "Documentation", link: `/${collection}/${version}/tooling/docs` },
						{ name: "Build Utility", link: `/${collection}/${version}/tooling/build` },
					],
				},
			],
		},
		{
			version: "v1",
			content: [],
		},
	].find(v => v.version === version)?.content ?? []

const pluginTypes = z.enum(["method-handler", "method-plugin", "callback-handler", "callback-plugin", "json-handler"])
export type PluginType = z.infer<typeof pluginTypes>

export type DocumentationCollection = (typeof documentationCollections)[number]
export type CollectionType<C extends DocumentationCollection> = Awaited<ReturnType<typeof getCollection<C>>>[number]

export const collections = {
	docs: defineCollection({
		type: "content",
		schema: z.object({
			title: z.string(),
			description: z.string().optional(),
		}),
	}),
	plugins: defineCollection({
		type: "content",
		schema: z.object({
			title: z.string(),
			icon: z.string().optional(),
			type: pluginTypes,
			transport: z.enum(["http", "ws"]),
			features: z.array(z.string()).optional(),
		}),
	}),
	api: defineCollection({
		type: "data",
	}),
}

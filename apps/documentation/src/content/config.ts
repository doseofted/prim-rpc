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
		subdomain: "", // not on a subdomain
		available: true,
	},
]
export const latestVersion = "v0"
export const documentationCollections = ["docs", "plugins"] as const

/** Table of Contents for Documentation pages */
export const documentationContents = (collection = "docs"): TableOfContents => [
	{
		name: "Learning",
		sections: [
			{ name: "Introduction", link: `/${collection}/learn/intro` },
			{ name: "Setup", link: `/${collection}/learn/setup` },
			{ name: "Advanced", link: `/${collection}/learn/advanced` },
			{ name: "Examples", link: `/${collection}/learn/examples` },
			{ name: "Security", link: `/${collection}/learn/security` },
			{ name: "Limitations", link: `/${collection}/learn/limitations` },
		],
	},
	{
		name: "Reference",
		sections: [
			{ name: "Configuration", link: `/${collection}/reference/config` },
			{ name: "Browse Plugins", link: `/${collection}/reference/plugins` },
			{ name: "Create Plugin", link: `/${collection}/reference/create` },
			{ name: "Structure", link: `/${collection}/reference/structure` },
		],
	},
	{
		name: "Tooling",
		sections: [
			{ name: "Documentation", link: `/${collection}/tooling/docs` },
			{ name: "Build Utility", link: `/${collection}/tooling/build` },
		],
	},
]

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

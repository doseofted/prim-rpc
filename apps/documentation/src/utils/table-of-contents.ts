import safeSet from "just-safe-set"
import safeGet from "just-safe-get"
import { defu } from "defu"
import type { getCollection } from "astro:content"

export interface TableOfContentsSection {
	name: string
	link?: string
	sections?: TableOfContentsSection[]
}
export type TableOfContents = TableOfContentsSection[]

type CollectionMap = "docs" | "plugins"
export type CollectionType<M extends CollectionMap> = Awaited<ReturnType<typeof getCollection<M>>>[number]
export type CollectionTree<T extends Record<string, unknown>> = { [key: string]: CollectionData<T> }
export type CollectionData<T extends Record<string, unknown>> = CollectionTree<T> & { $data: T & { slug: string } }
export function documentationTableOfContentsTree<M extends CollectionMap>(collection: CollectionType<M>[]) {
	const docContents: CollectionTree<CollectionType<M>["data"]> = {}
	const dataList = collection.map(({ data, slug }, index) => ({ ...data, slug, order: data.order ?? index }))
	for (const $data of dataList) {
		const path = $data.slug.split("/").join(".")
		const existing = (safeGet(docContents, path) ?? {}) as typeof docContents
		safeSet(docContents, path, defu({ $data }, existing))
	}
	return docContents
}

const sectionNames: Record<string, { name: string; order: number }> = {
	usage: { name: "Library Usage", order: 1 },
	reference: { name: "Reference", order: 2 },
	integrations: { name: "Integrations", order: 3 },
}
export function createTableOfContentsFromTree<M extends CollectionMap>(
	collection: M,
	tree: CollectionTree<CollectionType<M>["data"]>,
	slug?: string
) {
	const versionsAvailable = Object.keys(tree)
	const version = slug?.split("/")?.[0]
	const versionContent = tree[version ?? "v0"] as CollectionData<CollectionType<M>["data"]>
	const tableOfContents: TableOfContents = Object.entries(versionContent)
		.filter(([key]) => key !== "$data")
		.sort((a, b) => ((sectionNames[a[0]]?.order ?? 1) < (sectionNames[b[0]]?.order ?? 1) ? -1 : 1))
		.map(([key, value]) => ({
			name: sectionNames[key]?.name,
			sections: Object.entries(value)
				.filter(([key]) => key !== "$data")
				.map(([_, v]) => v as CollectionData<CollectionType<M>["data"]>)
				.sort((a, b) => ((a.$data.order ?? 1) < (b.$data.order ?? 1) ? -1 : 1))
				.map(value => ({
					name: value.$data.title,
					link: `/${collection}/${value.$data.slug}`,
				})),
		}))
	return {
		versions: versionsAvailable,
		version,
		tableOfContents,
	}
}

export interface TableOfContentsSection {
	name: string
	link?: string
	sections?: TableOfContentsSection[]
}

export type TableOfContents = TableOfContentsSection[]

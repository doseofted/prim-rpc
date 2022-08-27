// SECTION: Groups
export type GroupTitle = 
	| "Properties"
	| "Variables"
	| "Functions"
export interface TypeDocGroup {
	title: GroupTitle
	children: number[]
}
// !SECTION

export interface GroupAndChildren<GroupedChildren> {
	groups: TypeDocGroup[]
	children: GroupedChildren[]
}

// SECTION Comment
export type CommentType = "code"|"text"
interface CommentSummaryItem {
	kind: CommentType
	text: string
}
export type TagType = "@returns"
export interface BlogTag {
	tag: TagType
	content: CommentSummaryItem[]
}
export interface CommentItem {
	summary: CommentSummaryItem[]
	blogTags?: BlogTag[]
}
// !SECTION

// SECTION Source
interface Source {
	fileName: string
	line: number
	character: number
}
// !SECTION


// SECTION Generic TypeDoc item types
export interface GenericDocItemBase {
	id: number
	name: string
	originalName?: string
	kind: number
	kindString: string
	flags: { [flag: string]: boolean }
	sources: Source[]
}
export interface GenericDocItemWithChildren<Child> extends GenericDocItemBase {
	children: Child[]
	groups: TypeDocGroup[]
}
// !SECTION

// SECTION types
export interface TypeDocReflect<DeclarationType> {
	type: "reflection"
	declaration: DeclarationType
}
export interface TypeDocLiteral<Literal = unknown> {
	type: "literal"
	value: Literal
}
// !SECTION

// SECTION: Specific TypeDoc item types
// export interface DocItemFunction extends GenericDocItemBase {
// 	// ...
// }
export interface DocItemVariable extends GenericDocItemBase {
	type: TypeDocReflect<unknown>|TypeDocLiteral
}
// !SECTION

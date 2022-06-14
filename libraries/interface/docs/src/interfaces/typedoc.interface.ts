export interface TypeDocBasic {
	id: number;
	name: string;
	kind: number;
	kindString: string;
}

export interface TypeDoc extends TypeDocBasic {
	flags: FlagsFound;
	originalName: string;
	children: Child[];
	groups: Group[];
	sources: Source[];
}

export interface Child extends TypeDocBasic {
	flags: FlagsFound;
	comment?: ChildComment;
	sources: Source[];
	type?: ParameterType;
	defaultValue?: string;
	signatures?: ChildSignature[];
}

export interface ChildComment {
	shortText: string;
	text?: string;
}

export interface ChildSignature extends TypeDocBasic {
	flags: FlagsFound;
	comment: SignatureComment;
	parameters: ChildParameter[];
	type: SignatureType;
}

export interface SignatureComment {
	shortText: string;
	returns?: string;
}

export interface FlagsFound {
	isOptional?: boolean;
	isConst?: boolean;
}

export interface ChildParameter extends TypeDocBasic {
	flags: FlagsFound;
	type: ParameterType;
	defaultValue?: string;
	comment?: ParameterComment;
}

export interface ParameterComment {
	shortText: string;
}

export interface ParameterElement extends TypeDocBasic {
	flags: FlagsFound;
	parameters?: ParameterElement[];
	type?: TypeArgumentElement;
	signatures?: ChildSignature[];
}

export interface ParameterDeclaration extends TypeDocBasic {
	flags: FlagsFound;
	children?: ParameterChild[];
	groups?: Group[];
	signatures?: ParameterElement[];
}

export interface TentacledDeclaration extends TypeDocBasic {
	flags: FlagsFound;
	signatures?: ChildSignature[];
	children?: TentacledChild[];
	groups?: Group[];
}

export interface ParameterType {
	type: TypeEnum;
	name?: string;
	declaration?: ParameterDeclaration;
	value?: string;
}

export interface SignatureType {
	type: string;
	name: string;
	typeArguments?: TypeArgumentElement[];
	qualifiedName?: string;
	package?: string;
}

export interface TypeArgumentElement {
	type: TypeEnum;
	name: Name;
}

export enum Name {
	String = "string",
	Void = "void",
}

export enum TypeEnum {
	Intrinsic = "intrinsic",
	Reflection = "reflection",
}

export interface ParameterChild extends TypeDocBasic {
	flags: FlagsFound;
	sources: Source[];
	type: TypeArgumentElement;
}

export interface Source {
	fileName: FileName;
	line: number;
	character: number;
}

export enum FileName {
	IndexTs = "index.ts",
}

export interface Group {
	title: string;
	kind: number;
	children: number[];
}

export interface FluffyChild extends TypeDocBasic {
	flags: FlagsFound;
	type: StickyType;
}

export interface StickyType {
	type: TypeEnum;
	declaration: TentacledDeclaration;
}

export interface TentacledChild extends TypeDocBasic {
	flags: FlagsFound;
	type: StickyType;
}


export interface JsDocItem {
	comment?: string;
	meta?: Meta;
	description?: string;
	name?: string;
	longname: string;
	kind: Kind;
	scope?: Scope;
	undocumented?: boolean;
	params?: Param[];
	returns?: Return[];
	async?: boolean;
	memberof?: string;
	files?: string[];
}

export enum Kind {
	Constant = "constant",
	Function = "function",
	Member = "member",
	Package = "package",
}

export interface Meta {
	range: number[];
	filename: string;
	lineno: number;
	columnno: number;
	path: string;
	code: Code;
	vars?: {
		[key: string]: unknown
	};
}

export interface Code {
	id: string;
	name: string;
	type: string;
	value?: number | string;
	paramnames?: string[];
}

export interface Param {
	description: string;
	name: string;
}

export interface Return {
	description: string;
}

export enum Scope {
	Global = "global",
	Inner = "inner",
	Static = "static",
}

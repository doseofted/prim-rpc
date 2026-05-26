/** Properties and method names that should never be utilized from the library */
export const functionDenyList: string[] = [
	"prototype",
	"__proto__",
	"constructor",
	"toString",
	"toLocaleString",
	"valueOf",
	"apply",
	"bind",
	"call",
	"arguments",
	"caller",
];

/** Utility to check if given key is in the deny list */
export function inFunctionDenyList(
	key: PropertyKey | undefined | null,
): boolean {
	return typeof key === "string" && functionDenyList.includes(key);
}

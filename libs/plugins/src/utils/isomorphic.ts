const usingNode = typeof process !== "undefined" && typeof require !== "undefined"

export async function useFileForEnv() {
	const given = !usingNode && typeof File === "undefined" ? await import("node:buffer") : { File }
	return given.File
}

const usingNode = typeof process !== "undefined" && typeof require !== "undefined"

export type FileForEnvType = Awaited<ReturnType<typeof useFileForEnv>>
export async function useFileForEnv() {
	const given = usingNode ? await import("node:buffer") : { File }
	return given.File
}

export type BlobForEnvType = Awaited<ReturnType<typeof useBlobForEnv>>
export async function useBlobForEnv() {
	const given = usingNode ? await import("node:buffer") : { Blob }
	return given.Blob
}

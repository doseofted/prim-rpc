export function hello(you: string, greeting?: string) { return `${greeting ?? "Hello"} ${you}!` }
export function given({ greeting, you }: { you: string, greeting: string }) { return { you, greeting } }

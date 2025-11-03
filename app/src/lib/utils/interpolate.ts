/**
 * Interpolates template strings with variables
 * Example: interpolate("Hello {name}!", { name: "World" }) => "Hello World!"
 */
export function interpolate(template: string, variables: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key) => {
		const value = variables[key]
		return value !== undefined ? String(value) : match
	})
}

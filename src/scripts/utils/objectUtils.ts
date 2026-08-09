/**
 * Check if value is object
 * @param item Value
 * @returns Is value an object?
 */
const isObject = (item: unknown): item is Record<string, unknown> => (
	item !== null && typeof item === 'object' && !Array.isArray(item)
);

/**
 * Schema-constrained deep merge that only overrides existing properties with matching types
 * @param schema Schema object
 * @param object Object to apply to schema
 * @returns Merged object with only valid overrides
 */
export const mergeWithSchema = (
	schema: Record<string, any>,
	object: Record<string, any>
): Record<string, any> => {
	const output = { ...schema };

	if (isObject(schema) && isObject(object)) {
		Object.keys(object).forEach(key => {
			if (key in schema) {
				const sourceValue = object[key];
				const targetValue = schema[key];

				if (isObject(sourceValue) && isObject(targetValue)) {
					// Recursively merge nested objects
					output[key] = mergeWithSchema(targetValue, sourceValue);
				} else if (typeof sourceValue === typeof targetValue) {
					// Only override if types match
					output[key] = sourceValue;
				}
			}
		});
	}

	return output;
};

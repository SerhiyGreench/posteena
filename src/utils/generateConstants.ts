export type Paths<T> = T extends object
    ? {
          [K in keyof T]: T[K] extends object
              ? K extends string
                  ? `${K}.${string & Paths<T[K]>}`
                  : never
              : K;
      }[keyof T]
    : never;

export type KeysToCamelCase<T> = T extends string
    ? T extends `${infer First}.${infer Rest}`
        ? `${Capitalize<First>}${KeysToCamelCase<Rest>}`
        : Capitalize<T>
    : never;

export type GenerateConstantsType<T> = {
    [P in Paths<T> as KeysToCamelCase<P>]: P;
};

export function generateConstants<T extends object>(
    obj: T,
    prefix = '',
): GenerateConstantsType<T> {
    const result = {} as Record<string, string>;

    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue;
        }

        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const camelKey = key.charAt(0).toUpperCase() + key.slice(1);
        const finalKey = prefix
            ? prefix.charAt(0).toUpperCase() + prefix.slice(1) + camelKey
            : camelKey;

        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        ) {
            Object.assign(result, generateConstants(value as object, fullKey));
        } else {
            result[finalKey] = fullKey;
        }
    }

    return result as GenerateConstantsType<T>;
}

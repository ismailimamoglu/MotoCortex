/**
 * Defensive JSON parsing helper with fallback.
 * Prevents unhandled JSON.parse exceptions on malformed strings or network payloads.
 */
export function safeParse<T = any>(jsonString: string | null | undefined, fallback: T | null = null): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
        return fallback;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.warn('[safeParse] Failed to parse JSON string:', error);
        return fallback;
    }
}

export default safeParse;

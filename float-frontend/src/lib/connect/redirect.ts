// src/lib/connect/redirect.ts

/** Only same-origin absolute paths are allowed as post-login destinations. */
export function safeRedirect(raw: string | null | undefined): string | null {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
	return raw;
}

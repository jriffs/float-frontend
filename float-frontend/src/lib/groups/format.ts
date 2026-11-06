/** USDC has 6 decimals on-chain. UI amounts are always minor units (i64-safe integers). */

const USDC_DECIMALS = 6;
const SCALE = 10 ** USDC_DECIMALS;

export function usdcFromMinor(minor: number): number {
	return minor / SCALE;
}

/**
 * Formats a signed USDC amount for list cards and summary.
 * Examples: +$42.50 · −$18.80 · $0.00
 */
export function formatUsdc(
	minor: number,
	opts: { signed?: boolean; compact?: boolean } = {}
): string {
	const { signed = true } = opts;
	const value = usdcFromMinor(minor);
	const abs = Math.abs(value);
	const body = abs.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	if (!signed || value === 0) return `$${body}`;
	return value > 0 ? `+$${body}` : `−$${body}`;
}

/** Yield chip prefers more precision for small numbers. */
export function formatYield(minor: number): string {
	const value = usdcFromMinor(minor);
	if (value === 0) return '$0.00';
	if (value < 0.01) {
		return `$${value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
	}
	return `$${value.toFixed(2)}`;
}

export function balanceTone(minor: number): 'mint' | 'coral' | 'mute' {
	if (minor > 0) return 'mint';
	if (minor < 0) return 'coral';
	return 'mute';
}

export function balanceLabel(minor: number): string {
	if (minor > 0) return 'owed to you';
	if (minor < 0) return 'you owe';
	return 'all settled';
}
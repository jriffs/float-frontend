const ERRORS: Record<number, string> = {
	6000: 'Group name is too long (max 32 bytes).',
	6001: 'This group is not active.',
	6002: 'This group is already closed.',
	6003: 'Pool is not enabled.',
	6004: 'Pool is already enabled.',
	6005: 'Pool funds are deployed to Kamino.',
	6006: 'Pool funds are not deployed.',
	6007: 'Shares must sum exactly to the expense amount.',
	6008: 'Amount must be greater than zero.',
	6009: 'Unauthorized.',
	6010: 'You are already a member of this group.',
	6011: 'Insufficient pool value.',
	6012: 'Cannot withdraw while the group is open.',
	6013: 'Arithmetic overflow.',
	6014: 'Settle all balances before closing the group.',
	6015: 'Pool account is missing or inconsistent.',
	6016: 'Settlement mint does not match this group.',
	6017: 'A required Kamino account was missing.',
	6018: 'Invalid Kamino program account.',
	6019: 'Kamino vault does not match the pool.'
};

export class FloatProgramError extends Error {
	code: number | null;
	constructor(message: string, code: number | null = null) {
		super(message);
		this.name = 'FloatProgramError';
		this.code = code;
	}
}

/** Map Anchor / wallet errors to plain UI copy. */
export function mapProgramError(e: unknown): FloatProgramError {
	const raw = e instanceof Error ? e.message : String(e);
	const lower = raw.toLowerCase();

	if (lower.includes('user rejected') || lower.includes('rejected the request')) {
		return new FloatProgramError('Request declined', null);
	}
	if (lower.includes('insufficient funds') || lower.includes('attempt to debit')) {
		return new FloatProgramError('Not enough SOL for fees', 6008);
	}

	const m = raw.match(/Error Code: (\w+)\. Error Number: (\d+)/i)
		?? raw.match(/custom program error: 0x([0-9a-f]+)/i)
		?? raw.match(/"Custom":(\d+)/);

	if (m) {
		let code: number;
		if (m[0].includes('0x')) code = parseInt(m[1], 16);
		else if (m[2]) code = parseInt(m[2], 10);
		else code = parseInt(m[1], 10);
		const msg = ERRORS[code] ?? raw;
		return new FloatProgramError(msg, code);
	}

	for (const [codeStr, msg] of Object.entries(ERRORS)) {
		if (raw.includes(msg) || raw.includes(Object.keys(ERRORS).find(() => false) ?? '')) {
			/* fall through */
		}
		if (raw.includes(codeStr)) return new FloatProgramError(msg, Number(codeStr));
	}

	return new FloatProgramError(raw || 'Transaction failed', null);
}
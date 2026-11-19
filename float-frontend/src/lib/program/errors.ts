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
	/** Original RPC / wallet / Anchor payload for debugging. */
	causeRaw: unknown;

	constructor(message: string, code: number | null = null, causeRaw: unknown = null) {
		super(message);
		this.name = 'FloatProgramError';
		this.code = code;
		this.causeRaw = causeRaw;
	}
}

/** Verbose dump of whatever the RPC / wallet threw. */
export function logRpcError(context: string, e: unknown): void {
	// Always log in dev; strip or gate later if you ship to prod
	const base = {
		context,
		message: e instanceof Error ? e.message : String(e),
		name: e instanceof Error ? e.name : typeof e
	};

	console.groupCollapsed(`[float:rpc] ${context}`);
	console.error(base);

	if (e && typeof e === 'object') {
		const any = e as Record<string, unknown>;
		// web3.js SendTransactionError
		if ('logs' in any && Array.isArray(any.logs)) {
			console.error('program logs:', any.logs);
		}
		if (typeof any.getLogs === 'function') {
			try {
				const logs = (any as { getLogs: () => string[] }).getLogs();
				console.error('getLogs():', logs);
			} catch {
				/* ignore */
			}
		}
		if ('code' in any) console.error('code:', any.code);
		if ('data' in any) console.error('data:', any.data);
		if ('error' in any) console.error('error:', any.error);
		if ('transactionMessage' in any) console.error('transactionMessage:', any.transactionMessage);
		if ('transactionError' in any) console.error('transactionError:', any.transactionError);
		// full object last
		console.error('raw:', e);
	} else {
		console.error('raw:', e);
	}
	console.groupEnd();
}

/** Map Anchor / wallet errors to plain UI copy (and log the raw error). */
export function mapProgramError(e: unknown, context = 'tx'): FloatProgramError {
	logRpcError(context, e);

	const raw = e instanceof Error ? e.message : String(e);
	const lower = raw.toLowerCase();

	if (lower.includes('user rejected') || lower.includes('rejected the request')) {
		return new FloatProgramError('Request declined', null, e);
	}
	if (lower.includes('insufficient funds') || lower.includes('attempt to debit')) {
		return new FloatProgramError('Not enough SOL for fees', 6008, e);
	}

	const m =
		raw.match(/Error Code: (\w+)\. Error Number: (\d+)/i) ??
		raw.match(/custom program error: 0x([0-9a-f]+)/i) ??
		raw.match(/"Custom":(\d+)/);

	if (m) {
		let code: number;
		if (m[0].includes('0x')) code = parseInt(m[1], 16);
		else if (m[2]) code = parseInt(m[2], 10);
		else code = parseInt(m[1], 10);
		const msg = ERRORS[code] ?? raw;
		return new FloatProgramError(msg, code, e);
	}

	for (const [codeStr, msg] of Object.entries(ERRORS)) {
		if (raw.includes(codeStr)) return new FloatProgramError(msg, Number(codeStr), e);
	}

	return new FloatProgramError(raw || 'Transaction failed', null, e);
}
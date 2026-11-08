import { PublicKey } from '@solana/web3.js';
import { FLOAT_PROGRAM_ID, SEEDS } from './constants.ts';

export function groupPda(creator: PublicKey, name: string): PublicKey {
	return PublicKey.findProgramAddressSync(
		[SEEDS.group, creator.toBuffer(), Buffer.from(name)],
		FLOAT_PROGRAM_ID
	)[0];
}

export function memberBalancePda(group: PublicKey, member: PublicKey): PublicKey {
	return PublicKey.findProgramAddressSync(
		[SEEDS.memberBalance, group.toBuffer(), member.toBuffer()],
		FLOAT_PROGRAM_ID
	)[0];
}

/** expense_index is Group.expense_count at the moment of log_expense (u32 LE). */
export function expensePda(group: PublicKey, expenseIndex: number): PublicKey {
	const idx = Buffer.alloc(4);
	idx.writeUInt32LE(expenseIndex);
	return PublicKey.findProgramAddressSync(
		[SEEDS.expense, group.toBuffer(), idx],
		FLOAT_PROGRAM_ID
	)[0];
}

export function poolPda(group: PublicKey): PublicKey {
	return PublicKey.findProgramAddressSync([SEEDS.pool, group.toBuffer()], FLOAT_PROGRAM_ID)[0];
}
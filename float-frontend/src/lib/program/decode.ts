import { PublicKey } from '@solana/web3.js';
import type { GroupAccount, MemberBalanceAccount, ExpenseAccount } from './types.ts';

function readU64(buf: Buffer, off: number): number {
	// USDC amounts fit in 2^53 for practical balances
	return Number(buf.readBigUInt64LE(off));
}

function readI64(buf: Buffer, off: number): number {
	return Number(buf.readBigInt64LE(off));
}

function readPubkey(buf: Buffer, off: number): PublicKey {
	return new PublicKey(buf.subarray(off, off + 32));
}

function readBytesAsString(buf: Buffer, off: number, len: number): string {
	const slice = buf.subarray(off, off + len);
	const end = slice.indexOf(0);
	return new TextDecoder().decode(end === -1 ? slice : slice.subarray(0, end));
}

/** Anchor account layouts: 8-byte discriminator + fields. */
export function decodeGroup(pubkey: PublicKey, data: Buffer): GroupAccount {
	let o = 8;
	const creator = readPubkey(data, o); o += 32;
	const name = readBytesAsString(data, o, 32); o += 32;
	const settlementMint = readPubkey(data, o); o += 32;
	const memberCount = data.readUInt8(o++);
	const unsettledMemberCount = data.readUInt8(o++);
	const expenseCount = data.readUInt32LE(o); o += 4;
	const poolEnabled = data.readUInt8(o++) === 1;
	const status = data.readUInt8(o++);
	const bump = data.readUInt8(o++);
	return {
		pubkey,
		creator,
		name,
		settlementMint,
		memberCount,
		unsettledMemberCount,
		expenseCount,
		poolEnabled,
		status,
		bump
	};
}

export function decodeMemberBalance(pubkey: PublicKey, data: Buffer): MemberBalanceAccount {
	let o = 8;
	const group = readPubkey(data, o); o += 32;
	const member = readPubkey(data, o); o += 32;
	const balance = readI64(data, o); o += 8;
	const depositedPrincipal = readU64(data, o); o += 8;
	const poolShares = readU64(data, o); o += 8;
	const bump = data.readUInt8(o++);
	return { pubkey, group, member, balance, depositedPrincipal, poolShares, bump };
}

export function decodeExpense(pubkey: PublicKey, data: Buffer): ExpenseAccount {
	let o = 8;
	const group = readPubkey(data, o); o += 32;
	const payer = readPubkey(data, o); o += 32;
	const amount = readU64(data, o); o += 8;
	const description = readBytesAsString(data, o, 64); o += 64;
	const timestamp = readI64(data, o); o += 8;
	const expenseIndex = data.readUInt32LE(o); o += 4;
	const participantCount = data.readUInt8(o++);
	const paidFromPool = data.readUInt8(o++) === 1;
	const bump = data.readUInt8(o++);
	return {
		pubkey,
		group,
		payer,
		amount,
		description,
		timestamp,
		expenseIndex,
		participantCount,
		paidFromPool,
		bump
	};
}
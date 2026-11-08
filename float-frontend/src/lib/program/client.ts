import {
	Connection,
	PublicKey,
	SystemProgram,
	Transaction,
	type TransactionSignature
} from '@solana/web3.js';
import {
	TOKEN_PROGRAM_ID,
	ASSOCIATED_TOKEN_PROGRAM_ID,
	getAssociatedTokenAddressSync,
	createAssociatedTokenAccountIdempotentInstruction
} from '@solana/spl-token';
import { Program, AnchorProvider, BN, type Idl } from '@coral-xyz/anchor';
import type { BaseMessageSignerWalletAdapter } from '@solana/wallet-adapter-base';
import idl from './idl/float.json';
import { FLOAT_PROGRAM_ID, USDC_MINT, RPC_URL } from './constants.ts';
import { groupPda, memberBalancePda, expensePda } from './pdas.ts';
import { decodeGroup, decodeMemberBalance, decodeExpense } from './decode.ts';
import type { GroupAccount, MemberBalanceAccount, ExpenseAccount } from './types.ts';
import { mapProgramError } from './errors.ts';

export type WalletAdapter = BaseMessageSignerWalletAdapter;

function connection(): Connection {
	return new Connection(RPC_URL, 'confirmed');
}

/** Minimal Anchor wallet shim over the adapter. */
function anchorWallet(adapter: WalletAdapter) {
	if (!adapter.publicKey) throw new Error('Wallet not connected');
	return {
		publicKey: adapter.publicKey,
		signTransaction: async <T extends Transaction>(tx: T) => adapter.signTransaction(tx),
		signAllTransactions: async <T extends Transaction>(txs: T[]) =>
			adapter.signAllTransactions(txs)
	};
}

function program(adapter: WalletAdapter): Program {
	const conn = connection();
	const provider = new AnchorProvider(conn, anchorWallet(adapter) as any, {
		commitment: 'confirmed',
		preflightCommitment: 'confirmed'
	});
	return new Program(idl as Idl, provider);
}

async function send(adapter: WalletAdapter, tx: Transaction): Promise<TransactionSignature> {
	const conn = connection();
	const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
	tx.recentBlockhash = blockhash;
	tx.feePayer = adapter.publicKey!;
	const signed = await adapter.signTransaction(tx);
	try {
		const sig = await conn.sendRawTransaction(signed.serialize(), {
			skipPreflight: false,
			preflightCommitment: 'confirmed'
		});
		await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
		return sig;
	} catch (e) {
		throw mapProgramError(e);
	}
}

// ---- reads ----

export async function fetchGroup(group: PublicKey): Promise<GroupAccount | null> {
	const info = await connection().getAccountInfo(group);
	if (!info) return null;
	return decodeGroup(group, Buffer.from(info.data));
}

export async function fetchMemberBalance(
	group: PublicKey,
	member: PublicKey
): Promise<MemberBalanceAccount | null> {
	const pda = memberBalancePda(group, member);
	const info = await connection().getAccountInfo(pda);
	if (!info) return null;
	return decodeMemberBalance(pda, Buffer.from(info.data));
}

/** All MemberBalance accounts for a group (memcmp on group field at offset 8). */
export async function fetchGroupMembers(group: PublicKey): Promise<MemberBalanceAccount[]> {
	const accounts = await connection().getProgramAccounts(FLOAT_PROGRAM_ID, {
		filters: [
			{ dataSize: 8 + 32 + 32 + 8 + 8 + 8 + 1 },
			{ memcmp: { offset: 8, bytes: group.toBase58() } }
		]
	});
	return accounts.map((a) => decodeMemberBalance(a.pubkey, Buffer.from(a.account.data)));
}

export async function fetchExpense(
	group: PublicKey,
	index: number
): Promise<ExpenseAccount | null> {
	const pda = expensePda(group, index);
	const info = await connection().getAccountInfo(pda);
	if (!info) return null;
	return decodeExpense(pda, Buffer.from(info.data));
}

// ---- writes (bill split) ----

export interface CreateGroupParams {
	adapter: WalletAdapter;
	name: string;
	/** Defaults to Devnet USDC. */
	settlementMint?: PublicKey;
}

export async function createGroup(params: CreateGroupParams): Promise<{
	signature: TransactionSignature;
	group: PublicKey;
}> {
	const { adapter, name } = params;
	const mint = params.settlementMint ?? USDC_MINT;
	const creator = adapter.publicKey!;
	const group = groupPda(creator, name);
	const memberBalance = memberBalancePda(group, creator);
	const prog = program(adapter);

	try {
		const ix = await prog.methods
			.createGroup(name, mint)
			.accounts({
				creator,
				group,
				memberBalance,
				settlementMint: mint,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix));
		return { signature: sig, group };
	} catch (e) {
		throw mapProgramError(e);
	}
}

export interface JoinGroupParams {
	adapter: WalletAdapter;
	/** Group creator pubkey (from invite metadata). */
	creator: PublicKey;
	name: string;
}

export async function joinGroup(params: JoinGroupParams): Promise<{
	signature: TransactionSignature;
	group: PublicKey;
}> {
	const { adapter, creator, name } = params;
	const member = adapter.publicKey!;
	const group = groupPda(creator, name);
	const memberBalance = memberBalancePda(group, member);
	const prog = program(adapter);

	try {
		const ix = await prog.methods
			.joinGroup(name)
			.accounts({
				member,
				creator,
				group,
				memberBalance,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix));
		return { signature: sig, group };
	} catch (e) {
		throw mapProgramError(e);
	}
}

export interface LogExpenseParams {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
	/** Total in minor units (USDC 6dp). */
	amount: number;
	description: string;
	/**
	 * Parallel arrays: participant wallets + share minor units.
	 * Shares MUST sum to `amount`. Include the payer.
	 * Remaining accounts = MemberBalance PDAs in this same order.
	 */
	participants: { wallet: PublicKey; share: number }[];
}

export async function logExpense(params: LogExpenseParams): Promise<{
	signature: TransactionSignature;
	expenseIndex: number;
	group: PublicKey;
}> {
	const { adapter, creator, groupName, amount, description, participants } = params;
	const payer = adapter.publicKey!;
	const group = groupPda(creator, groupName);
	const g = await fetchGroup(group);
	if (!g) throw mapProgramError(new Error('Group not found'));

	const expenseIndex = g.expenseCount;
	const expense = expensePda(group, expenseIndex);
	const payerBalance = memberBalancePda(group, payer);
	const shares = participants.map((p) => new BN(p.share));
	const remaining = participants.map((p) => ({
		pubkey: memberBalancePda(group, p.wallet),
		isWritable: true,
		isSigner: false
	}));

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.logExpense(groupName, new BN(amount), description, shares)
			.accounts({
				payer,
				creator,
				group,
				payerBalance,
				expense,
				systemProgram: SystemProgram.programId
			})
			.remainingAccounts(remaining)
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix));
		return { signature: sig, expenseIndex, group };
	} catch (e) {
		throw mapProgramError(e);
	}
}

export interface SettleParams {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
	/** Counterparty who receives USDC (you owe them). */
	toMember: PublicKey;
	/** Minor units to pay. */
	amount: number;
}

export async function settle(params: SettleParams): Promise<{
	signature: TransactionSignature;
}> {
	const { adapter, creator, groupName, toMember, amount } = params;
	const settler = adapter.publicKey!;
	const group = groupPda(creator, groupName);
	const g = await fetchGroup(group);
	if (!g) throw mapProgramError(new Error('Group not found'));

	const mint = g.settlementMint;
	const fromBalance = memberBalancePda(group, settler);
	const toBalance = memberBalancePda(group, toMember);
	const fromAta = getAssociatedTokenAddressSync(mint, settler);
	const toAta = getAssociatedTokenAddressSync(mint, toMember);

	const conn = connection();
	const tx = new Transaction();

	// Ensure both ATAs exist (idempotent).
	tx.add(
		createAssociatedTokenAccountIdempotentInstruction(settler, fromAta, settler, mint),
		createAssociatedTokenAccountIdempotentInstruction(settler, toAta, toMember, mint)
	);

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.settle(groupName, new BN(amount))
			.accounts({
				settler,
				creator,
				group,
				fromBalance,
				toBalance,
				settlementMint: mint,
				fromTokenAccount: fromAta,
				toTokenAccount: toAta,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		tx.add(ix);
		const sig = await send(adapter, tx);
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e);
	}
}

export { connection, groupPda, memberBalancePda, expensePda, FLOAT_PROGRAM_ID, USDC_MINT };
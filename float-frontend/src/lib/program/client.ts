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
import { groupPda, memberBalancePda, expensePda, poolPda } from './pdas.ts';
import { decodeGroup, decodeMemberBalance, decodeExpense, decodePool } from './decode.ts';
import type { GroupAccount, MemberBalanceAccount, ExpenseAccount, PoolAccount } from './types.ts';
import { mapProgramError } from './errors.ts';
import { fetchKaminoResolve } from './kamino-resolve.ts';

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

async function send(
	adapter: WalletAdapter,
	tx: Transaction,
	label = 'send'
): Promise<TransactionSignature> {
	const conn = connection();
	const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
	tx.recentBlockhash = blockhash;
	tx.feePayer = adapter.publicKey!;

	console.info(`[float:rpc] ${label} signing…`, {
		feePayer: adapter.publicKey?.toBase58(),
		ixCount: tx.instructions.length
	});

	const signed = await adapter.signTransaction(tx);
	try {
		const sig = await conn.sendRawTransaction(signed.serialize(), {
			skipPreflight: false,
			preflightCommitment: 'confirmed'
		});
		console.info(`[float:rpc] ${label} submitted`, sig);
		await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
		console.info(`[float:rpc] ${label} confirmed`, sig);
		return sig;
	} catch (e) {
		// Prefer simulation logs when web3 attaches them
		throw mapProgramError(e, label);
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

/** All MemberBalance accounts owned by `member` (memcmp on member field at offset 40). */
export async function fetchWalletMemberBalances(
	member: PublicKey
): Promise<MemberBalanceAccount[]> {
	const accounts = await connection().getProgramAccounts(FLOAT_PROGRAM_ID, {
		filters: [
			{ dataSize: 8 + 32 + 32 + 8 + 8 + 8 + 1 },
			{ memcmp: { offset: 40, bytes: member.toBase58() } }
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

/** Fetch all expenses for a group (indices 0 .. expenseCount-1). */
export async function fetchGroupExpenses(
	group: PublicKey,
	expenseCount: number
): Promise<ExpenseAccount[]> {
	if (expenseCount <= 0) return [];

	const conn = connection();
	const pdas = Array.from({ length: expenseCount }, (_, i) => expensePda(group, i));
	const infos = await conn.getMultipleAccountsInfo(pdas);

	const out: ExpenseAccount[] = [];
	for (let i = 0; i < infos.length; i++) {
		const info = infos[i];
		if (!info) continue;
		out.push(decodeExpense(pdas[i]!, Buffer.from(info.data)));
	}
	// newest first
	out.sort((a, b) => b.expenseIndex - a.expenseIndex);
	return out;
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
		throw mapProgramError(e, 'createGroup');
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
		throw mapProgramError(e, 'joinGroup');
	}
}

export interface LogExpenseParams {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
	amount: number;
	description: string;
	/**
	 * Members included in the expense.
	 * - Equal split: pass everyone (including payer); shares are ignored when equalSplit is true.
	 * - Custom: payer + others with shareMinor; sum must equal amount.
	 */
	participants: { wallet: PublicKey; share: number }[];
	/** When true (default), on-chain equal split; remaining = others only, shares = []. */
	equalSplit?: boolean;
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
	if (!g) throw mapProgramError(new Error('Group not found'), 'logExpense');

	const expenseIndex = g.expenseCount;
	const expense = expensePda(group, expenseIndex);
	const payerBalance = memberBalancePda(group, payer);

	// Program does equal split when shares is empty.
	// remaining_accounts = OTHER members only (never the payer).
	const others = participants.filter((p) => !p.wallet.equals(payer));
	const remaining = others.map((p) => ({
		pubkey: memberBalancePda(group, p.wallet),
		isWritable: true,
		isSigner: false
	}));

	// Optional: still allow custom split later via non-empty shares
	const useProgramEqualSplit = participants.every((p) => p.share === 0) || params.equalSplit === true;

	let shares: BN[];
	if (useProgramEqualSplit) {
		shares = []; // handler: base = amount / n, remainder → payer
	} else {
		const payerPart = participants.find((p) => p.wallet.equals(payer));
		if (!payerPart) {
			throw mapProgramError(new Error('Payer must be in participants'), 'logExpense');
		}
		const ordered = [payerPart, ...others];
		const sum = ordered.reduce((s, p) => s + p.share, 0);
		if (sum !== amount) {
			throw mapProgramError(
				new Error(`Share sum ${sum} !== amount ${amount}`),
				'logExpense'
			);
		}
		shares = ordered.map((p) => new BN(p.share));
	}

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

		const sig = await send(adapter, new Transaction().add(ix), 'logExpense');
		return { signature: sig, expenseIndex, group };
	} catch (e) {
		throw mapProgramError(e, 'logExpense');
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
		throw mapProgramError(e, 'settle');
	}
}

export async function fetchPool(group: PublicKey): Promise<PoolAccount | null> {
	const pda = poolPda(group);
	const info = await connection().getAccountInfo(pda);
	if (!info) return null;
	return decodePool(pda, Buffer.from(info.data));
}

export interface EnablePoolParams {
	adapter: WalletAdapter;
	groupName: string;
}

/** Creator only — initializes Pool PDA, sets group.pool_enabled. */
export async function enablePool(params: EnablePoolParams): Promise<{
	signature: TransactionSignature;
	pool: PublicKey;
}> {
	const { adapter, groupName } = params;
	const creator = adapter.publicKey!;
	const group = groupPda(creator, groupName);
	const pool = poolPda(group);
	const prog = program(adapter);

	try {
		const ix = await prog.methods
			.enablePool(groupName)
			.accounts({
				creator,
				group,
				pool,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix), 'enablePool');
		return { signature: sig, pool };
	} catch (e) {
		throw mapProgramError(e, 'enablePool');
	}
}

export interface DepositParams {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
	/** USDC minor units */
	amount: number;
}

export async function depositToPool(params: DepositParams): Promise<{
	signature: TransactionSignature;
}> {
	const { adapter, creator, groupName, amount } = params;
	const depositor = adapter.publicKey!;
	const group = groupPda(creator, groupName);
	const g = await fetchGroup(group);
	if (!g) throw mapProgramError(new Error('Group not found'), 'deposit');
	if (!g.poolEnabled) throw mapProgramError(new Error('Pool is not enabled'), 'deposit');

	const pool = poolPda(group);
	const memberBalance = memberBalancePda(group, depositor);
	const mint = g.settlementMint;
	const depositorAta = getAssociatedTokenAddressSync(mint, depositor);
	const poolAta = getAssociatedTokenAddressSync(mint, pool, true); // allowOwnerOffCurve

	const tx = new Transaction().add(
		createAssociatedTokenAccountIdempotentInstruction(depositor, depositorAta, depositor, mint),
		createAssociatedTokenAccountIdempotentInstruction(depositor, poolAta, pool, mint)
	);

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.deposit(groupName, new BN(amount))
			.accounts({
				depositor,
				creator,
				group,
				pool,
				memberBalance,
				settlementMint: mint,
				depositorTokenAccount: depositorAta,
				poolTokenAccount: poolAta,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		tx.add(ix);
		const sig = await send(adapter, tx, 'deposit');
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e, 'deposit');
	}
}

export interface WithdrawParams {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
}

/** Only when group is closed and pool is not deployed. */
export async function withdrawFromPool(params: WithdrawParams): Promise<{
	signature: TransactionSignature;
}> {
	const { adapter, creator, groupName } = params;
	const member = adapter.publicKey!;
	const group = groupPda(creator, groupName);
	const g = await fetchGroup(group);
	if (!g) throw mapProgramError(new Error('Group not found'), 'withdraw');

	const pool = poolPda(group);
	const memberBalance = memberBalancePda(group, member);
	const mint = g.settlementMint;
	const memberAta = getAssociatedTokenAddressSync(mint, member);
	const poolAta = getAssociatedTokenAddressSync(mint, pool, true);

	const tx = new Transaction().add(
		createAssociatedTokenAccountIdempotentInstruction(member, memberAta, member, mint)
	);

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.withdraw(groupName)
			.accounts({
				member,
				creator,
				group,
				pool,
				memberBalance,
				settlementMint: mint,
				poolTokenAccount: poolAta,
				memberTokenAccount: memberAta,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId
			})
			.instruction();

		tx.add(ix);
		const sig = await send(adapter, tx, 'withdraw');
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e, 'withdraw');
	}
}

async function kaminoCtx(params: {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
	vaultAddress?: string;
}): Promise<FloatKaminoContext & { group: GroupAccount }> {
	const { adapter, creator, groupName } = params;
	const groupPk = groupPda(creator, groupName);
	const group = await fetchGroup(groupPk);
	if (!group) throw mapProgramError(new Error('Group not found'), 'kamino');
	if (!group.poolEnabled) {
		throw mapProgramError(new Error('Pool is not enabled'), 'kamino');
	}

	const pool = poolPda(groupPk);
	const vaultAddress = params.vaultAddress ?? DEVNET_KAMINO_VAULT_ADDRESS;

	const resolved = await resolveKaminoAccounts({
		vaultAddress,
		poolPda: pool.toBase58(),
		creator: creator.toBase58(),
		settlementMint: group.settlementMint.toBase58(),
		rpcUrl: RPC_URL
	});

	return {
		program: program(adapter),
		groupName,
		creator: adapter.publicKey!, // signer
		creatorAuthority: creator, // group seed authority
		groupPda: groupPk,
		poolPda: pool,
		settlementMint: group.settlementMint,
		resolved,
		group
	};
}

export async function deployToKamino(params: {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
}): Promise<{ signature: TransactionSignature }> {
	const { adapter, creator, groupName } = params;
	if (!adapter.publicKey?.equals(creator)) {
		throw mapProgramError(new Error('Only the group creator can deploy'), 'deployToKamino');
	}

	const groupPk = groupPda(creator, groupName);
	const g = await fetchGroup(groupPk);
	if (!g?.poolEnabled) {
		throw mapProgramError(new Error('Pool is not enabled'), 'deployToKamino');
	}

	const resolved = await fetchKaminoResolve({
		group: groupPk.toBase58(),
		creator: creator.toBase58(),
		settlementMint: g.settlementMint.toBase58(),
		groupName
	});

	// Prefer resolver maps; ensure signer keys match connected wallet
	const accounts = {
		...resolved.deployAccounts,
		creator: adapter.publicKey!,
		creatorAuthority: creator
	};

	const sharesMint = resolved.sharesMint;
	const pool = accounts.pool;
	const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
		adapter.publicKey!,
		getAssociatedTokenAddressSync(sharesMint, pool, true),
		pool,
		sharesMint,
		TOKEN_PROGRAM_ID
	);

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.deployToKamino(groupName)
			.accounts(accounts as any)
			.remainingAccounts(resolved.deployRemaining)
			.instruction();

		const sig = await send(
			adapter,
			new Transaction().add(createAtaIx, ix),
			'deployToKamino'
		);
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e, 'deployToKamino');
	}
}

export async function recallFromKamino(params: {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
}): Promise<{ signature: TransactionSignature }> {
	const { adapter, creator, groupName } = params;
	if (!adapter.publicKey?.equals(creator)) {
		throw mapProgramError(new Error('Only the group creator can recall'), 'recallFromKamino');
	}

	const groupPk = groupPda(creator, groupName);
	const g = await fetchGroup(groupPk);
	if (!g) throw mapProgramError(new Error('Group not found'), 'recallFromKamino');

	const resolved = await fetchKaminoResolve({
		group: groupPk.toBase58(),
		creator: creator.toBase58(),
		settlementMint: g.settlementMint.toBase58(),
		groupName
	});

	const accounts = {
		...resolved.recallAccounts,
		creator: adapter.publicKey!,
		creatorAuthority: creator
	};

	const prog = program(adapter);
	try {
		const ix = await prog.methods
			.recallFromKamino(groupName)
			.accounts(accounts as any)
			.remainingAccounts(resolved.recallRemaining)
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix), 'recallFromKamino');
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e, 'recallFromKamino');
	}
}

export async function harvestYield(params: {
	adapter: WalletAdapter;
	creator: PublicKey;
	groupName: string;
}): Promise<{ signature: TransactionSignature }> {
	const { adapter, creator, groupName } = params;
	const groupPk = groupPda(creator, groupName);
	const g = await fetchGroup(groupPk);
	if (!g) throw mapProgramError(new Error('Group not found'), 'harvestYield');

	const pool = poolPda(groupPk);
	const poolAta = getAssociatedTokenAddressSync(g.settlementMint, pool, true);
	const prog = program(adapter);

	try {
		const ix = await prog.methods
			.harvestYield(groupName)
			.accounts({
				creator: adapter.publicKey!, // payer if needed
				creatorAuthority: creator,
				group: groupPk,
				pool,
				settlementMint: g.settlementMint,
				poolTokenAccount: poolAta,
				tokenProgram: TOKEN_PROGRAM_ID
			})
			.instruction();

		const sig = await send(adapter, new Transaction().add(ix), 'harvestYield');
		return { signature: sig };
	} catch (e) {
		throw mapProgramError(e, 'harvestYield');
	}
}

export { connection, groupPda, memberBalancePda, expensePda, poolPda, FLOAT_PROGRAM_ID, USDC_MINT };
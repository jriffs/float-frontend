// src/lib/connect/connect-flow.svelte.ts
// State machine for S1: welcome -> wallet sheet -> signature. Framework-agnostic about navigation:
// the page passes `onAuthenticated` and decides where to go next. S5 (invite gate) reuses this too.

import { sessionMatchesWallet, signInWithWallet } from '#lib/supabase/core.ts';
import { WalletFlowError, reasonFor, type ConnectErrorReason } from '#lib/wallet/errors.ts';
import type { WalletStore } from '#lib/wallet/wallet.svelte.ts';

export type SheetState =
	| { kind: 'closed' }
	| { kind: 'picker' }
	| { kind: 'connecting'; wallet: string }
	| { kind: 'error'; reason: ConnectErrorReason; wallet?: string };

export type SignState = 'idle' | 'signing' | 'rejected' | 'failed';

interface Options {
	/** Called once the wallet is connected AND a Supabase session exists for it. */
	onAuthenticated: (address: string) => Promise<void> | void;
}

export class ConnectFlow {
	step = $state<'welcome' | 'sign'>('welcome');
	sheet = $state<SheetState>({ kind: 'closed' });
	sign = $state<SignState>('idle');
	/** True while we check for a remembered wallet and live session on first load. */
	booting = $state(true);

	#wallet: WalletStore;
	#onAuthenticated: Options['onAuthenticated'];
	#lastWallet: string | undefined;
	/** Bumped to ignore results of attempts the user has abandoned. */
	#attempt = 0;

	constructor(wallet: WalletStore, options: Options) {
		this.#wallet = wallet;
		this.#onAuthenticated = options.onAuthenticated;
	}

	/** Returning users: reconnect silently and skip straight in if the session is still valid. */
	async bootstrap(): Promise<void> {
		try {
			const address = await this.#wallet.restore();
			if (address && (await sessionMatchesWallet(address))) await this.#onAuthenticated(address);
		} catch {
			/* stay on the welcome screen */
		} finally {
			this.booting = false;
		}
	}

	// ----- wallet sheet -----

	openPicker(): void {
		this.sheet = { kind: 'picker' };
	}

	closeSheet(): void {
		if (this.sheet.kind === 'closed') return;
		if (this.sheet.kind === 'connecting') this.#attempt++; // abandon the pending connect
		this.sheet = { kind: 'closed' };
	}

	chooseAnother(): void {
		this.#attempt++;
		this.openPicker();
	}

	async choose(name: string): Promise<void> {
		const id = ++this.#attempt;
		this.#lastWallet = name;
		this.sheet = { kind: 'connecting', wallet: name };
		try {
			const address = await this.#wallet.connect(name);
			if (id !== this.#attempt) return;
			this.sheet = { kind: 'closed' };

			// Same wallet, live session: no signature needed.
			if (await sessionMatchesWallet(address)) {
				await this.#onAuthenticated(address);
				return;
			}
			this.sign = 'idle';
			this.step = 'sign';
		} catch (e) {
			if (id !== this.#attempt) return;
			this.sheet = { kind: 'error', reason: reasonFor(e), wallet: name };
		}
	}

	retry(): Promise<void> | void {
		return this.#lastWallet ? this.choose(this.#lastWallet) : this.openPicker();
	}

	// ----- called by other parts of the app -----

	showExpired(): void {
		this.sheet = { kind: 'error', reason: 'expired' };
	}

	/**
	 * Wallet adapters cannot read the cluster a wallet points at. Call this when a later
	 * RPC/transaction check proves the wallet is on the wrong network.
	 */
	reportWrongNetwork(wallet?: string): void {
		this.sheet = { kind: 'error', reason: 'wrong-network', wallet };
	}

	signInAgain(): void {
		this.sheet = { kind: 'closed' };
		if (this.#wallet.status === 'connected') {
			this.sign = 'idle';
			this.step = 'sign';
		} else {
			this.openPicker();
		}
	}

	// ----- signature step -----

	/* async signIn(): Promise<void> {
		this.sign = 'signing';
		try {
			const address = await signInWithWallet(this.#wallet.signer());
			await this.#onAuthenticated(address); // stays "signing" while the route changes
		} catch (e) {
			this.sign = reasonFor(e) === 'cancelled' ? 'rejected' : 'failed';
		}
	} */


	// ----- signature step -----

	/* async signIn(): Promise<void> {
		this.sign = 'signing';
		try {
			// 1. MODIFIED: Get the raw active adapter from the wallet store
			const activeAdapter = this.#wallet.getActiveAdapter();

			// 2. MODIFIED: Pass the raw adapter straight to Supabase 
			const supabaseToken = await signInWithWallet(activeAdapter);

			// 3. Fetch the actual base58 address string currently verified in your wallet store
			const walletAddress = this.#wallet.address;

			if (!walletAddress) {
				throw new Error('No verified wallet address found in store.');
			}

			// 4. Pass the wallet address to your routing callback instead of the token
			await this.#onAuthenticated(walletAddress);

		} catch (e) {
			console.error("Authentication redirect failed:", e); // Log it so it doesn't fail silently
			this.sign = reasonFor(e) === 'cancelled' ? 'rejected' : 'failed';
		}
	} */


	// Inside src/lib/connect/connect-flow.svelte.ts 

	async signIn(): Promise<void> {
		this.sign = 'signing';
		try {
			const walletAddress = this.#wallet.address;
			if (!walletAddress) {
				throw new Error('No verified wallet address found in store.');
			}

			await signInWithWallet(this.#wallet.signer());
			await this.#onAuthenticated(walletAddress);
		} catch (e) {
			console.error('Authentication failed:', e);
			this.sign = reasonFor(e) === 'cancelled' ? 'rejected' : 'failed';
		}
	}





	backToWelcome(): void {
		this.step = 'welcome';
		this.sign = 'idle';
	}

	async useDifferentWallet(): Promise<void> {
		await this.#wallet.disconnect();
		this.backToWelcome();
		this.openPicker();
	}
}

export { WalletFlowError };

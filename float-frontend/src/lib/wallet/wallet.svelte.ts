// src/lib/wallet/wallet.svelte.ts
// Reactive wallet store on top of Solana Wallet Adapter. One instance per app, shared via context.

import { createContext } from 'svelte';
import { browser } from '$app/env';
import { SvelteMap } from 'svelte/reactivity';
import { WalletReadyState, type BaseMessageSignerWalletAdapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import type { signInWithWalletManual } from '#lib/supabase/core.ts';
import { WalletFlowError } from './errors';

type SupabaseWallet = NonNullable<Parameters<typeof signInWithWalletManual>[0]>;

export interface WalletOption {
	name: string;
	/** Tailwind classes for the wallet's icon tile. */
	tile: string;
	recommended: boolean;
	installed: boolean;
}

interface Entry {
	adapter: BaseMessageSignerWalletAdapter;
	name: string;
	tile: string;
	recommended: boolean;
	installUrl: string;
	/** Opens this page inside the wallet's in-app browser (mobile). */
	deeplink?: (url: string, origin: string) => string;
}

const LAST_WALLET_KEY = 'float:last-wallet';

const isMobile = (): boolean => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isUsable = (state: WalletReadyState | undefined): boolean =>
	state === WalletReadyState.Installed || state === WalletReadyState.Loadable;

function remember(name: string | null): void {
	try {
		if (name) localStorage.setItem(LAST_WALLET_KEY, name);
		else localStorage.removeItem(LAST_WALLET_KEY);
	} catch {
		/* storage unavailable (private mode): remembering is optional */
	}
}
function recall(): string | null {
	try {
		return localStorage.getItem(LAST_WALLET_KEY);
	} catch {
		return null;
	}
}

export class WalletStore {
	status = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
	/** Name of the wallet being used, e.g. "Phantom". */
	selected = $state<string | null>(null);
	/** Base58 public key of the connected account. */
	address = $state<string | null>(null);

	#entries: Entry[];
	#ready = new SvelteMap<string, WalletReadyState>();
	#teardown: Array<() => void> = [];

	constructor() {
		this.#entries = [
			{
				adapter: new PhantomWalletAdapter(),
				name: 'Phantom',
				tile: 'bg-[linear-gradient(135deg,#A78BFA,#6D5AE6)]',
				recommended: true,
				installUrl: 'https://phantom.app/download',
				deeplink: (url, origin) =>
					`https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`
			},
			{
				adapter: new SolflareWalletAdapter(),
				name: 'Solflare',
				tile: 'bg-[linear-gradient(135deg,#60A5FA,#3B82F6)]',
				recommended: false,
				installUrl: 'https://solflare.com/download',
				deeplink: (url, origin) =>
					`https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`
			},
			{
				adapter: new BackpackWalletAdapter() as unknown as BaseMessageSignerWalletAdapter,
				name: 'Backpack',
				tile: 'bg-[linear-gradient(135deg,#F472B6,#E11D74)]',
				recommended: false,
				installUrl: 'https://backpack.app/downloads'
			}
		];

		for (const entry of this.#entries) {
			const { adapter, name } = entry;
			this.#ready.set(name, adapter.readyState);

			const onReady = (state: WalletReadyState) => this.#ready.set(name, state);
			const onConnect = () => {
				// The user switched accounts inside the wallet.
				if (this.selected === name) this.address = adapter.publicKey?.toBase58() ?? null;
			};
			const onDisconnect = () => {
				if (this.selected === name) this.#reset();
			};

			adapter.on('readyStateChange', onReady);
			adapter.on('connect', onConnect);
			adapter.on('disconnect', onDisconnect);
			this.#teardown.push(() => {
				adapter.off('readyStateChange', onReady);
				adapter.off('connect', onConnect);
				adapter.off('disconnect', onDisconnect);
			});
		}
	}

	get options(): WalletOption[] {
		return this.#entries.map((e) => ({
			name: e.name,
			tile: e.tile,
			recommended: e.recommended,
			installed: isUsable(this.#ready.get(e.name))
		}));
	}

	/** Where "Get <wallet>" should go. On mobile this opens the wallet's in-app browser. */
	installHref(name: string): string {
		const entry = this.#entries.find((e) => e.name === name) ?? this.#entries[0];
		if (isMobile() && entry.deeplink) return entry.deeplink(location.href, location.origin);
		return entry.installUrl;
	}

	openInstall(name: string): void {
		const href = this.installHref(name);
		if (isMobile()) location.assign(href);
		else window.open(href, '_blank', 'noopener,noreferrer');
	}

	/** Connects and returns the base58 address. Throws WalletFlowError('no-wallet') if not installed. */
	async connect(name: string): Promise<string> {
		const entry = this.#entries.find((e) => e.name === name);
		if (!entry || !isUsable(this.#ready.get(name))) throw new WalletFlowError('no-wallet');

		this.selected = name;
		this.status = 'connecting';
		try {
			await entry.adapter.connect();
			const address = entry.adapter.publicKey?.toBase58();
			if (!address) throw new Error('The wallet did not return an account.');
			this.address = address;
			this.status = 'connected';
			remember(name);
			return address;
		} catch (e) {
			this.#reset();
			throw e;
		}
	}

	/** Reconnects the last-used wallet silently (no popup if it is already trusted). */
	async restore(): Promise<string | null> {
		const entry = this.#entries.find((e) => e.name === recall());
		if (!entry || !isUsable(this.#ready.get(entry.name))) return null;

		this.selected = entry.name;
		this.status = 'connecting';
		try {
			await entry.adapter.autoConnect();
			const address = entry.adapter.publicKey?.toBase58() ?? null;
			if (!address) {
				this.#reset();
				return null;
			}
			this.address = address;
			this.status = 'connected';
			return address;
		} catch {
			this.#reset();
			return null;
		}
	}

	async disconnect(): Promise<void> {
		const entry = this.#entries.find((e) => e.name === this.selected);
		remember(null);
		this.#reset();
		try {
			await entry?.adapter.disconnect();
		} catch {
			/* already disconnected */
		}
	}

	/** What `signInWithWallet` needs: the account key plus the wallet's signMessage. */
	signer(): SupabaseWallet {
		const adapter = this.#entries.find((e) => e.name === this.selected)?.adapter;
		const publicKey = adapter?.publicKey;
		if (!adapter || !publicKey) throw new WalletFlowError('failed', 'No wallet is connected.');
		return { publicKey, signMessage: (message: Uint8Array) => adapter.signMessage(message) } as any;
	}

	/** Returns the raw unmutated wallet adapter instance currently selected. */
	getActiveAdapter(): BaseMessageSignerWalletAdapter | undefined {
		return this.#entries.find((e) => e.name === this.selected)?.adapter;
	}

	destroy(): void {
		for (const off of this.#teardown) off();
		this.#teardown = [];
	}

	#reset(): void {
		this.status = 'disconnected';
		this.selected = null;
		this.address = null;
	}
}

export function getProvider() {
  // Only search for Phantom if running securely inside the client browser
  if (!browser) return null;
  
  if ('solana' in window) {
    const provider = (window as any).solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  
  return null;
}

export const [getWalletContext, setWalletContext] = createContext<WalletStore>();

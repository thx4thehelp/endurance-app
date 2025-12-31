import { ethers } from 'ethers';

const RPC_URL = 'https://api.endurance.work/api/rpc';

export function weiToEth(weiHex: string): string {
  try {
    const weiBigInt = BigInt(weiHex);
    // ethers.formatEther를 사용하여 정밀도 손실 방지
    return ethers.formatEther(weiBigInt);
  } catch {
    return '0';
  }
}

export async function getBalance(address: string): Promise<{ balance: string; balanceEth: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`RATE_LIMITED:${retryAfter || '5'}`);
    }

    if (response.status === 403) {
      throw new Error('BANNED');
    }

    if (!response.ok) {
      throw new Error(`HTTP_ERROR:${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      balance: data.result,
      balanceEth: weiToEth(data.result)
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    if (err instanceof Error && err.message.includes('fetch')) {
      throw new Error('CONNECTION_FAILED');
    }
    throw err;
  }
}

export function generateRandomWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

export function walletFromPrivateKey(privateKey: string): { address: string; privateKey: string } | null {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch {
    return null;
  }
}

export function walletFromMnemonic(mnemonic: string, index: number = 0): { address: string; privateKey: string } | null {
  try {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch {
    return null;
  }
}

export const BIP39_WORDLIST = ethers.wordlists.en;

export function isValidMnemonicWord(word: string): boolean {
  const wordlist = BIP39_WORDLIST;
  for (let i = 0; i < 2048; i++) {
    if (wordlist.getWord(i) === word.toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function getWordlistArray(): string[] {
  const words: string[] = [];
  for (let i = 0; i < 2048; i++) {
    words.push(BIP39_WORDLIST.getWord(i));
  }
  return words;
}

export async function getMyIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
}

export async function checkServerStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'latest'],
        id: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    return !data.error && data.result !== undefined;
  } catch {
    return false;
  }
}

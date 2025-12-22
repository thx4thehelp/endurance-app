import { ethers } from 'ethers';

const RPC_URL = 'https://api.endurance.work/api/rpc';

export function weiToEth(weiHex: string): string {
  const weiBigInt = BigInt(weiHex);
  const ethValue = Number(weiBigInt) / 1e18;
  return ethValue.toFixed(6);
}

export async function getBalance(address: string): Promise<{ balance: string; balanceEth: string } | null> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    });

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

export async function checkServerStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // 실제 주소로 eth_getBalance 조회해서 서버 상태 확인
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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
    // JSON-RPC 에러가 없고 result가 있으면 온라인
    return !data.error && data.result !== undefined;
  } catch {
    return false;
  }
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

const HEX_CHARS = '0123456789abcdef';

export function* generatePrivateKeyCombinations(
  knownChars: string[],
  unknownPositions: number[],
  startIndex: bigint = 0n
): Generator<{ privateKey: string; index: bigint }> {
  const totalCombinations = 16n ** BigInt(unknownPositions.length);
  let index = startIndex;

  while (index < totalCombinations) {
    const chars = [...knownChars];
    let remaining = index;

    for (let i = unknownPositions.length - 1; i >= 0; i--) {
      const pos = unknownPositions[i];
      const charIndex = Number(remaining % 16n);
      chars[pos] = HEX_CHARS[charIndex];
      remaining = remaining / 16n;
    }

    yield { privateKey: '0x' + chars.join(''), index };
    index++;
  }
}

export function* generateMnemonicCombinations(
  knownWords: string[],
  unknownPositions: number[],
  startIndex: bigint = 0n
): Generator<{ mnemonic: string; index: bigint }> {
  const wordlist = getWordlistArray();
  const totalCombinations = 2048n ** BigInt(unknownPositions.length);
  let index = startIndex;

  while (index < totalCombinations) {
    const words = [...knownWords];
    let remaining = index;

    for (let i = unknownPositions.length - 1; i >= 0; i--) {
      const pos = unknownPositions[i];
      const wordIndex = Number(remaining % 2048n);
      words[pos] = wordlist[wordIndex];
      remaining = remaining / 2048n;
    }

    yield { mnemonic: words.join(' '), index };
    index++;
  }
}

export function calculateTotalCombinations(unknownCount: number, base: number): bigint {
  return BigInt(base) ** BigInt(unknownCount);
}

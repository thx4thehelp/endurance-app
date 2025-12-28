// Web Worker for wallet generation
import { ethers } from 'ethers';

const BIP39_WORDLIST = ethers.wordlists.en;

function getWordlistArray(): string[] {
  const words: string[] = [];
  for (let i = 0; i < 2048; i++) {
    words.push(BIP39_WORDLIST.getWord(i));
  }
  return words;
}

function generateRandomWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

function walletFromPrivateKey(privateKey: string): { address: string; privateKey: string } | null {
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

function walletFromMnemonic(mnemonic: string): { address: string; privateKey: string } | null {
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

const HEX_CHARS = '0123456789abcdef';

interface GenerateRandomRequest {
  type: 'generateRandom';
  count: number;
}

interface GenerateMnemonicRequest {
  type: 'generateMnemonic';
  knownWords: string[];
  unknownPositions: number[];
  startIndex: string; // bigint as string
  count: number;
}

interface GeneratePrivateKeyRequest {
  type: 'generatePrivateKey';
  knownChars: string[];
  unknownPositions: number[];
  startIndex: string; // bigint as string
  count: number;
}

type WorkerRequest = GenerateRandomRequest | GenerateMnemonicRequest | GeneratePrivateKeyRequest;

interface RandomWalletResult {
  address: string;
  privateKey: string;
}

interface MnemonicWalletResult {
  mnemonic: string;
  address: string;
  privateKey: string;
  index: string; // bigint as string
}

interface PrivateKeyWalletResult {
  key: string;
  address: string;
  privateKey: string;
  index: string; // bigint as string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;

  switch (request.type) {
    case 'generateRandom': {
      const wallets: RandomWalletResult[] = [];
      for (let i = 0; i < request.count; i++) {
        wallets.push(generateRandomWallet());
      }
      self.postMessage({ type: 'randomResult', wallets });
      break;
    }

    case 'generateMnemonic': {
      const wordlist = getWordlistArray();
      const wallets: MnemonicWalletResult[] = [];
      let index = BigInt(request.startIndex);
      const totalCombinations = 2048n ** BigInt(request.unknownPositions.length);

      // 유효한 지갑이 count개 모일 때까지 계속 시도
      while (wallets.length < request.count && index < totalCombinations) {
        const words = [...request.knownWords];
        let remaining = index;

        for (let j = request.unknownPositions.length - 1; j >= 0; j--) {
          const pos = request.unknownPositions[j];
          const wordIndex = Number(remaining % 2048n);
          words[pos] = wordlist[wordIndex];
          remaining = remaining / 2048n;
        }

        const mnemonic = words.join(' ');
        const wallet = walletFromMnemonic(mnemonic);

        if (wallet) {
          wallets.push({
            mnemonic,
            address: wallet.address,
            privateKey: wallet.privateKey,
            index: index.toString()
          });
        }

        index++;
      }

      self.postMessage({
        type: 'mnemonicResult',
        wallets,
        nextIndex: index.toString()
      });
      break;
    }

    case 'generatePrivateKey': {
      const wallets: PrivateKeyWalletResult[] = [];
      let index = BigInt(request.startIndex);
      const totalCombinations = 16n ** BigInt(request.unknownPositions.length);

      for (let i = 0; i < request.count && index < totalCombinations; i++) {
        const chars = [...request.knownChars];
        let remaining = index;

        for (let j = request.unknownPositions.length - 1; j >= 0; j--) {
          const pos = request.unknownPositions[j];
          const charIndex = Number(remaining % 16n);
          chars[pos] = HEX_CHARS[charIndex];
          remaining = remaining / 16n;
        }

        const key = '0x' + chars.join('');
        const wallet = walletFromPrivateKey(key);

        if (wallet) {
          wallets.push({
            key,
            address: wallet.address,
            privateKey: wallet.privateKey,
            index: index.toString()
          });
        }

        index++;
      }

      self.postMessage({
        type: 'privateKeyResult',
        wallets,
        nextIndex: index.toString()
      });
      break;
    }
  }
};

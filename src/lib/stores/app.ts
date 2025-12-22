import { writable } from 'svelte/store';
import { saveWallet, type WalletRecord } from '$lib/db';

export const agreed = writable<boolean>(false);
export const currentPage = writable<string>('main');

export interface WalletResult {
  id: string;
  address: string;
  privateKey: string;
  balance: string;
  balanceEth: string;
  source: 'random' | 'mnemonic' | 'privatekey';
  timestamp: number;
}

// 카운트만 추적 (실제 데이터는 DB에서 페이징으로 가져옴)
export const totalWalletCount = writable<number>(0);
export const balanceWalletCount = writable<number>(0);

export interface RecoveryProgress {
  mnemonic: {
    currentIndex: bigint;
    totalCombinations: bigint;
    isRunning: boolean;
    knownWords: string[];
    unknownPositions: number[];
  };
  privateKey: {
    currentIndex: bigint;
    totalCombinations: bigint;
    isRunning: boolean;
    knownChars: string[];
    unknownPositions: number[];
  };
}

export const recoveryProgress = writable<RecoveryProgress>({
  mnemonic: {
    currentIndex: 0n,
    totalCombinations: 0n,
    isRunning: false,
    knownWords: [],
    unknownPositions: []
  },
  privateKey: {
    currentIndex: 0n,
    totalCombinations: 0n,
    isRunning: false,
    knownChars: [],
    unknownPositions: []
  }
});

export function loadAgreement(): boolean {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('endurance_agreed') === 'true';
  }
  return false;
}

export function saveAgreement(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('endurance_agreed', 'true');
  }
}

// SQLite에 지갑 저장
export async function saveWalletResult(result: WalletResult): Promise<void> {
  await saveWallet(result);

  // 카운트 업데이트
  totalWalletCount.update(n => n + 1);
  if (parseFloat(result.balanceEth) > 0) {
    balanceWalletCount.update(n => n + 1);
  }
}

export interface ErrorModalState {
  show: boolean;
  message: string;
  countdown: number;
  onStop?: () => void;
}

export const errorModal = writable<ErrorModalState>({
  show: false,
  message: '',
  countdown: 0,
  onStop: undefined
});

export function loadRecoveryProgress(): RecoveryProgress | null {
  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem('endurance_recovery_progress');
    if (data) {
      const parsed = JSON.parse(data);
      parsed.mnemonic.currentIndex = BigInt(parsed.mnemonic.currentIndex);
      parsed.mnemonic.totalCombinations = BigInt(parsed.mnemonic.totalCombinations);
      parsed.privateKey.currentIndex = BigInt(parsed.privateKey.currentIndex);
      parsed.privateKey.totalCombinations = BigInt(parsed.privateKey.totalCombinations);
      return parsed;
    }
  }
  return null;
}

export function saveRecoveryProgress(progress: RecoveryProgress): void {
  if (typeof localStorage !== 'undefined') {
    const toSave = {
      mnemonic: {
        ...progress.mnemonic,
        currentIndex: progress.mnemonic.currentIndex.toString(),
        totalCombinations: progress.mnemonic.totalCombinations.toString()
      },
      privateKey: {
        ...progress.privateKey,
        currentIndex: progress.privateKey.currentIndex.toString(),
        totalCombinations: progress.privateKey.totalCombinations.toString()
      }
    };
    localStorage.setItem('endurance_recovery_progress', JSON.stringify(toSave));
  }
}

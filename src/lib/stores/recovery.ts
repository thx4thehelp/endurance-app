import { writable, get } from 'svelte/store';
import { generateRandomWallet, getBalance, getBalanceBatch, walletFromMnemonic, walletFromPrivateKey, getWordlistArray } from '$lib/utils/wallet';
import { saveWalletResult, errorModal, batchMode, type WalletResult } from '$lib/stores/app';
import WalletWorker from '$lib/workers/wallet.worker?worker';

const BIP39_WORDLIST = getWordlistArray();

// Web Worker 인스턴스
let walletWorker: Worker | null = null;

function getWorker(): Worker {
  if (!walletWorker) {
    walletWorker = new WalletWorker();
  }
  return walletWorker;
}

function terminateWorker() {
  if (walletWorker) {
    walletWorker.terminate();
    walletWorker = null;
  }
}

export type RecoveryType = 'random' | 'mnemonic' | 'privatekey' | null;

export interface RecoveryState {
  activeType: RecoveryType;
  random: {
    isRunning: boolean;
    totalChecked: number;
    foundCount: number;
    currentAddress: string;
    currentBalance: string;
    recentResults: { address: string; privateKey: string; balance: string }[];
  };
  mnemonic: {
    isRunning: boolean;
    totalChecked: number;
    foundCount: number;
    currentMnemonic: string;
    currentAddress: string;
    currentBalance: string;
    words: string[];
    currentIndex: bigint;
    totalCombinations: bigint;
    generator: Generator<{ mnemonic: string; index: bigint }, void, unknown> | null;
    recentResults: { mnemonic: string; address: string; privateKey: string; balance: string }[];
  };
  privatekey: {
    isRunning: boolean;
    totalChecked: number;
    foundCount: number;
    currentKey: string;
    currentAddress: string;
    currentBalance: string;
    chars: string[];
    currentIndex: bigint;
    totalCombinations: bigint;
    generator: Generator<{ key: string; index: bigint }, void, unknown> | null;
    recentResults: { address: string; privateKey: string; balance: string }[];
  };
}

const initialState: RecoveryState = {
  activeType: null,
  random: {
    isRunning: false,
    totalChecked: 0,
    foundCount: 0,
    currentAddress: '',
    currentBalance: '',
    recentResults: []
  },
  mnemonic: {
    isRunning: false,
    totalChecked: 0,
    foundCount: 0,
    currentMnemonic: '',
    currentAddress: '',
    currentBalance: '',
    words: Array(12).fill(''),
    currentIndex: 0n,
    totalCombinations: 0n,
    generator: null,
    recentResults: []
  },
  privatekey: {
    isRunning: false,
    totalChecked: 0,
    foundCount: 0,
    currentKey: '',
    currentAddress: '',
    currentBalance: '',
    chars: Array(64).fill(''),
    currentIndex: 0n,
    totalCombinations: 0n,
    generator: null,
    recentResults: []
  }
};

export const recoveryState = writable<RecoveryState>(initialState);

// 모든 타이머를 추적
const activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
let countdownId: ReturnType<typeof setInterval> | null = null;
let pendingWallet: { address: string; privateKey: string } | null = null;

function setTrackedTimeout(fn: () => void, delay: number): ReturnType<typeof setTimeout> {
  const id = setTimeout(() => {
    activeTimeouts.delete(id);
    fn();
  }, delay);
  activeTimeouts.add(id);
  return id;
}

function formatErrorMessage(message: string): string {
  if (message.startsWith('RATE_LIMITED')) {
    return '무료 버전은 IP당 1분에 60개 요청이 가능합니다.';
  }
  if (message === 'BANNED') {
    return '차단된 IP입니다. 관리자에게 문의해주세요.';
  }
  if (message.startsWith('HTTP_ERROR')) {
    return '서버 연결에 실패했습니다. 잠시 후 다시 시도합니다.';
  }
  if (message === 'TIMEOUT') {
    return '서버 응답 시간이 초과되었습니다. 서버 상태를 확인해주세요.';
  }
  if (message === 'CONNECTION_FAILED') {
    return '서버에 연결할 수 없습니다. 네트워크 또는 서버 상태를 확인해주세요.';
  }
  return message;
}

function showErrorModal(message: string, onStop: () => void) {
  const displayMessage = formatErrorMessage(message);
  errorModal.set({ show: true, message: displayMessage, countdown: 10, onStop });

  if (countdownId) clearInterval(countdownId);
  countdownId = setInterval(() => {
    errorModal.update(state => {
      if (state.countdown <= 1) {
        clearInterval(countdownId!);
        countdownId = null;
        return { show: false, message: '', countdown: 0, onStop: undefined };
      }
      return { ...state, countdown: state.countdown - 1 };
    });
  }, 1000);
}

function clearTimers() {
  // 모든 활성 타이머 정리
  activeTimeouts.forEach(id => clearTimeout(id));
  activeTimeouts.clear();

  if (countdownId) {
    clearInterval(countdownId);
    countdownId = null;
  }
  errorModal.set({ show: false, message: '', countdown: 0, onStop: undefined });
}

// 니모닉 조합 생성기
function* mnemonicCombinationGenerator(words: string[]): Generator<{ mnemonic: string; index: bigint }, void, unknown> {
  const unknownPositions = words.map((w, i) => w === '' ? i : -1).filter(i => i !== -1);
  const total = BigInt(2048) ** BigInt(unknownPositions.length);

  for (let i = 0n; i < total; i++) {
    const combination = [...words];
    let temp = i;

    for (let j = unknownPositions.length - 1; j >= 0; j--) {
      const wordIndex = Number(temp % 2048n);
      combination[unknownPositions[j]] = BIP39_WORDLIST[wordIndex];
      temp = temp / 2048n;
    }

    yield { mnemonic: combination.join(' '), index: i };
  }
}

// 프라이빗키 조합 생성기
function* privateKeyCombinationGenerator(chars: string[]): Generator<{ key: string; index: bigint }, void, unknown> {
  const HEX_CHARS = '0123456789abcdef';
  const unknownPositions = chars.map((c, i) => c === '' ? i : -1).filter(i => i !== -1);
  const total = BigInt(16) ** BigInt(unknownPositions.length);

  for (let i = 0n; i < total; i++) {
    const combination = [...chars];
    let temp = i;

    for (let j = unknownPositions.length - 1; j >= 0; j--) {
      const charIndex = Number(temp % 16n);
      combination[unknownPositions[j]] = HEX_CHARS[charIndex];
      temp = temp / 16n;
    }

    yield { key: combination.join(''), index: i };
  }
}

// 유효한 니모닉 찾기 (최대 1000개 스킵)
function findNextValidMnemonic(generator: Generator<{ mnemonic: string; index: bigint }, void, unknown>): { mnemonic: string; index: bigint; wallet: any } | null {
  for (let i = 0; i < 1000; i++) {
    const next = generator.next();
    if (next.done) return null;

    const { mnemonic, index } = next.value;
    const wallet = walletFromMnemonic(mnemonic);
    if (wallet) {
      return { mnemonic, index, wallet };
    }
  }
  return null;
}

// 모든 복구 중지
export function stopAllRecovery() {
  clearTimers();
  terminateWorker();
  recoveryState.update(state => ({
    ...state,
    activeType: null,
    random: { ...state.random, isRunning: false },
    mnemonic: { ...state.mnemonic, isRunning: false },
    privatekey: { ...state.privatekey, isRunning: false }
  }));
}

// 무작위 테스트 (배치 모드) - Web Worker 사용
async function runRandomCheckBatch() {
  const state = get(recoveryState);
  if (!state.random.isRunning) return;

  const BATCH_SIZE = 100;
  const worker = getWorker();

  // Worker에서 지갑 생성
  const walletsPromise = new Promise<{ address: string; privateKey: string }[]>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'randomResult') {
        worker.removeEventListener('message', handler);
        resolve(e.data.wallets);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'generateRandom', count: BATCH_SIZE });
  });

  recoveryState.update(s => ({
    ...s,
    random: { ...s.random, currentAddress: `지갑 생성 중... (${BATCH_SIZE}개)` }
  }));

  const wallets = await walletsPromise;
  const addresses = wallets.map(w => w.address);

  recoveryState.update(s => ({
    ...s,
    random: { ...s.random, currentAddress: `잔액 조회 중... (${BATCH_SIZE}개)` }
  }));

  try {
    const balanceResults = await getBalanceBatch(addresses);

    let checkedCount = 0;
    let foundCount = 0;
    const newResults: { address: string; privateKey: string; balance: string }[] = [];

    for (const wallet of wallets) {
      const balanceResult = balanceResults.get(wallet.address);
      if (balanceResult) {
        checkedCount++;

        const result: WalletResult = {
          id: crypto.randomUUID(),
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balance,
          balanceEth: balanceResult.balanceEth,
          source: 'random',
          timestamp: Date.now()
        };

        try {
          await saveWalletResult(result);
        } catch (e) {
          console.error('Failed to save wallet:', e);
        }

        const hasBalance = parseFloat(balanceResult.balanceEth) > 0;
        if (hasBalance) {
          foundCount++;
        }

        newResults.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balanceEth
        });
      }
    }

    recoveryState.update(s => ({
      ...s,
      random: {
        ...s.random,
        totalChecked: s.random.totalChecked + checkedCount,
        foundCount: s.random.foundCount + foundCount,
        currentBalance: newResults[0]?.balance || '0',
        currentAddress: wallets[wallets.length - 1].address,
        recentResults: [...newResults.slice(0, 10), ...s.random.recentResults].slice(0, 10)
      }
    }));

    const newState = get(recoveryState);
    if (newState.random.isRunning) {
      setTrackedTimeout(runRandomCheckBatch, 500);
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopRandomRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.random.isRunning) runRandomCheckBatch();
    }, 10000);
  }
}

// 무작위 테스트 (단일 모드)
async function runRandomCheck() {
  const state = get(recoveryState);
  if (!state.random.isRunning) return;

  // 배치 모드면 배치 함수 호출
  if (get(batchMode)) {
    return runRandomCheckBatch();
  }

  const wallet = pendingWallet || generateRandomWallet();
  pendingWallet = wallet;

  recoveryState.update(s => ({
    ...s,
    random: { ...s.random, currentAddress: wallet.address }
  }));

  try {
    const balanceResult = await getBalance(wallet.address);
    if (balanceResult) {
      pendingWallet = null;

      const result: WalletResult = {
        id: crypto.randomUUID(),
        address: wallet.address,
        privateKey: wallet.privateKey,
        balance: balanceResult.balance,
        balanceEth: balanceResult.balanceEth,
        source: 'random',
        timestamp: Date.now()
      };

      try {
        await saveWalletResult(result);
      } catch (e) {
        console.error('Failed to save wallet:', e);
      }

      const hasBalance = parseFloat(balanceResult.balanceEth) > 0;

      recoveryState.update(s => ({
        ...s,
        random: {
          ...s.random,
          totalChecked: s.random.totalChecked + 1,
          foundCount: hasBalance ? s.random.foundCount + 1 : s.random.foundCount,
          currentBalance: balanceResult.balanceEth,
          recentResults: [
            { address: wallet.address, privateKey: wallet.privateKey, balance: balanceResult.balanceEth },
            ...s.random.recentResults.slice(0, 9)
          ]
        }
      }));

      const newState = get(recoveryState);
      if (newState.random.isRunning) {
        setTrackedTimeout(runRandomCheck, 1000);
      }
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopRandomRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.random.isRunning) runRandomCheck();
    }, 10000);
  }
}

export function startRandomRecovery() {
  stopAllRecovery();
  recoveryState.update(s => ({
    ...s,
    activeType: 'random',
    random: { ...s.random, isRunning: true }
  }));
  runRandomCheck();
}

export function stopRandomRecovery() {
  clearTimers();
  recoveryState.update(s => ({
    ...s,
    activeType: s.activeType === 'random' ? null : s.activeType,
    random: { ...s.random, isRunning: false }
  }));
}

// 니모닉 복구용 Worker 상태
let mnemonicWorkerIndex = 0n;

// 니모닉 복구 (배치 모드) - Web Worker 사용
async function runMnemonicCheckBatch() {
  const state = get(recoveryState);
  if (!state.mnemonic.isRunning) return;

  const BATCH_SIZE = 100; // Worker에서 유효한 지갑 100개가 모일 때까지 생성
  const worker = getWorker();

  // 빈 칸 위치 찾기
  const unknownPositions = state.mnemonic.words.map((w, i) => w === '' ? i : -1).filter(i => i !== -1);

  if (mnemonicWorkerIndex >= state.mnemonic.totalCombinations) {
    stopMnemonicRecovery();
    return;
  }

  // Worker에서 지갑 생성
  const walletsPromise = new Promise<{ mnemonic: string; address: string; privateKey: string; index: string }[]>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'mnemonicResult') {
        worker.removeEventListener('message', handler);
        mnemonicWorkerIndex = BigInt(e.data.nextIndex);
        resolve(e.data.wallets);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({
      type: 'generateMnemonic',
      knownWords: state.mnemonic.words,
      unknownPositions,
      startIndex: mnemonicWorkerIndex.toString(),
      count: BATCH_SIZE
    });
  });

  recoveryState.update(s => ({
    ...s,
    mnemonic: { ...s.mnemonic, currentAddress: `지갑 생성 중... (${BATCH_SIZE}개)` }
  }));

  const wallets = await walletsPromise;

  if (wallets.length === 0) {
    stopMnemonicRecovery();
    return;
  }

  const addresses = wallets.map(w => w.address);

  recoveryState.update(s => ({
    ...s,
    mnemonic: { ...s.mnemonic, currentAddress: `잔액 조회 중... (${wallets.length}개)` }
  }));

  try {
    const balanceResults = await getBalanceBatch(addresses);

    let checkedCount = 0;
    let foundCount = 0;
    const newResults: { mnemonic: string; address: string; privateKey: string; balance: string }[] = [];

    for (const wallet of wallets) {
      const balanceResult = balanceResults.get(wallet.address);
      if (balanceResult) {
        checkedCount++;

        const result: WalletResult = {
          id: crypto.randomUUID(),
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balance,
          balanceEth: balanceResult.balanceEth,
          source: 'mnemonic',
          timestamp: Date.now()
        };

        try {
          await saveWalletResult(result);
        } catch (e) {
          console.error('Failed to save wallet:', e);
        }

        const hasBalance = parseFloat(balanceResult.balanceEth) > 0;
        if (hasBalance) {
          foundCount++;
        }

        newResults.push({
          mnemonic: wallet.mnemonic,
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balanceEth
        });
      }
    }

    const lastWallet = wallets[wallets.length - 1];

    recoveryState.update(s => ({
      ...s,
      mnemonic: {
        ...s.mnemonic,
        totalChecked: s.mnemonic.totalChecked + checkedCount,
        foundCount: s.mnemonic.foundCount + foundCount,
        currentBalance: newResults[0]?.balance || '0',
        currentMnemonic: lastWallet.mnemonic,
        currentAddress: lastWallet.address,
        currentIndex: BigInt(lastWallet.index),
        recentResults: [...newResults.slice(0, 10), ...s.mnemonic.recentResults].slice(0, 10)
      }
    }));

    const newState = get(recoveryState);
    if (newState.mnemonic.isRunning) {
      setTrackedTimeout(runMnemonicCheckBatch, 500);
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopMnemonicRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.mnemonic.isRunning) runMnemonicCheckBatch();
    }, 10000);
  }
}

// 니모닉 복구 (단일 모드)
async function runMnemonicCheck() {
  const state = get(recoveryState);
  if (!state.mnemonic.isRunning || !state.mnemonic.generator) return;

  // 배치 모드면 배치 함수 호출
  if (get(batchMode)) {
    return runMnemonicCheckBatch();
  }

  const validResult = findNextValidMnemonic(state.mnemonic.generator);

  if (!validResult) {
    stopMnemonicRecovery();
    return;
  }

  const { mnemonic, index, wallet } = validResult;

  recoveryState.update(s => ({
    ...s,
    mnemonic: {
      ...s.mnemonic,
      currentMnemonic: mnemonic,
      currentAddress: wallet.address,
      currentIndex: index
    }
  }));

  try {
    const balanceResult = await getBalance(wallet.address);
    if (balanceResult) {
      const result: WalletResult = {
        id: crypto.randomUUID(),
        address: wallet.address,
        privateKey: wallet.privateKey,
        balance: balanceResult.balance,
        balanceEth: balanceResult.balanceEth,
        source: 'mnemonic',
        timestamp: Date.now()
      };

      try {
        await saveWalletResult(result);
      } catch (e) {
        console.error('Failed to save wallet:', e);
      }

      const hasBalance = parseFloat(balanceResult.balanceEth) > 0;

      recoveryState.update(s => ({
        ...s,
        mnemonic: {
          ...s.mnemonic,
          totalChecked: s.mnemonic.totalChecked + 1,
          foundCount: hasBalance ? s.mnemonic.foundCount + 1 : s.mnemonic.foundCount,
          currentBalance: balanceResult.balanceEth,
          recentResults: [
            { mnemonic, address: wallet.address, privateKey: wallet.privateKey, balance: balanceResult.balanceEth },
            ...s.mnemonic.recentResults.slice(0, 9)
          ]
        }
      }));

      const newState = get(recoveryState);
      if (newState.mnemonic.isRunning) {
        setTrackedTimeout(runMnemonicCheck, 1000);
      }
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopMnemonicRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.mnemonic.isRunning) runMnemonicCheck();
    }, 10000);
  }
}

export function startMnemonicRecovery(words: string[]) {
  stopAllRecovery();

  const unknownCount = words.filter(w => w === '').length;
  const total = BigInt(2048) ** BigInt(unknownCount);
  const generator = mnemonicCombinationGenerator(words);

  // Worker 인덱스 초기화
  mnemonicWorkerIndex = 0n;

  recoveryState.update(s => ({
    ...s,
    activeType: 'mnemonic',
    mnemonic: {
      ...s.mnemonic,
      isRunning: true,
      words,
      currentIndex: 0n,
      totalCombinations: total,
      generator
    }
  }));

  runMnemonicCheck();
}

export function stopMnemonicRecovery() {
  clearTimers();
  recoveryState.update(s => ({
    ...s,
    activeType: s.activeType === 'mnemonic' ? null : s.activeType,
    mnemonic: { ...s.mnemonic, isRunning: false }
  }));
}

// 프라이빗키 복구용 Worker 상태
let privatekeyWorkerIndex = 0n;

// 프라이빗키 복구 (배치 모드) - Web Worker 사용
async function runPrivateKeyCheckBatch() {
  const state = get(recoveryState);
  if (!state.privatekey.isRunning) return;

  const BATCH_SIZE = 100;
  const worker = getWorker();

  // 빈 칸 위치 찾기
  const unknownPositions = state.privatekey.chars.map((c, i) => c === '' ? i : -1).filter(i => i !== -1);

  if (privatekeyWorkerIndex >= state.privatekey.totalCombinations) {
    stopPrivateKeyRecovery();
    return;
  }

  // Worker에서 지갑 생성
  const walletsPromise = new Promise<{ key: string; address: string; privateKey: string; index: string }[]>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'privateKeyResult') {
        worker.removeEventListener('message', handler);
        privatekeyWorkerIndex = BigInt(e.data.nextIndex);
        resolve(e.data.wallets);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({
      type: 'generatePrivateKey',
      knownChars: state.privatekey.chars,
      unknownPositions,
      startIndex: privatekeyWorkerIndex.toString(),
      count: BATCH_SIZE
    });
  });

  recoveryState.update(s => ({
    ...s,
    privatekey: { ...s.privatekey, currentAddress: `지갑 생성 중... (${BATCH_SIZE}개)` }
  }));

  const wallets = await walletsPromise;

  if (wallets.length === 0) {
    stopPrivateKeyRecovery();
    return;
  }

  const addresses = wallets.map(w => w.address);

  recoveryState.update(s => ({
    ...s,
    privatekey: { ...s.privatekey, currentAddress: `잔액 조회 중... (${wallets.length}개)` }
  }));

  try {
    const balanceResults = await getBalanceBatch(addresses);

    let checkedCount = 0;
    let foundCount = 0;
    const newResults: { address: string; privateKey: string; balance: string }[] = [];

    for (const wallet of wallets) {
      const balanceResult = balanceResults.get(wallet.address);
      if (balanceResult) {
        checkedCount++;

        const result: WalletResult = {
          id: crypto.randomUUID(),
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balance,
          balanceEth: balanceResult.balanceEth,
          source: 'privatekey',
          timestamp: Date.now()
        };

        try {
          await saveWalletResult(result);
        } catch (e) {
          console.error('Failed to save wallet:', e);
        }

        const hasBalance = parseFloat(balanceResult.balanceEth) > 0;
        if (hasBalance) {
          foundCount++;
        }

        newResults.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          balance: balanceResult.balanceEth
        });
      }
    }

    const lastWallet = wallets[wallets.length - 1];

    recoveryState.update(s => ({
      ...s,
      privatekey: {
        ...s.privatekey,
        totalChecked: s.privatekey.totalChecked + checkedCount,
        foundCount: s.privatekey.foundCount + foundCount,
        currentBalance: newResults[0]?.balance || '0',
        currentKey: lastWallet.key,
        currentAddress: lastWallet.address,
        currentIndex: BigInt(lastWallet.index),
        recentResults: [...newResults.slice(0, 10), ...s.privatekey.recentResults].slice(0, 10)
      }
    }));

    const newState = get(recoveryState);
    if (newState.privatekey.isRunning) {
      setTrackedTimeout(runPrivateKeyCheckBatch, 500);
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopPrivateKeyRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.privatekey.isRunning) runPrivateKeyCheckBatch();
    }, 10000);
  }
}

// 프라이빗키 복구 (단일 모드)
async function runPrivateKeyCheck() {
  const state = get(recoveryState);
  if (!state.privatekey.isRunning || !state.privatekey.generator) return;

  // 배치 모드면 배치 함수 호출
  if (get(batchMode)) {
    return runPrivateKeyCheckBatch();
  }

  const next = state.privatekey.generator.next();
  if (next.done) {
    stopPrivateKeyRecovery();
    return;
  }

  const { key, index } = next.value;
  const wallet = walletFromPrivateKey(key);

  if (!wallet) {
    setTrackedTimeout(runPrivateKeyCheck, 0);
    return;
  }

  recoveryState.update(s => ({
    ...s,
    privatekey: {
      ...s.privatekey,
      currentKey: key,
      currentAddress: wallet.address,
      currentIndex: index
    }
  }));

  try {
    const balanceResult = await getBalance(wallet.address);
    if (balanceResult) {
      const result: WalletResult = {
        id: crypto.randomUUID(),
        address: wallet.address,
        privateKey: wallet.privateKey,
        balance: balanceResult.balance,
        balanceEth: balanceResult.balanceEth,
        source: 'privatekey',
        timestamp: Date.now()
      };

      try {
        await saveWalletResult(result);
      } catch (e) {
        console.error('Failed to save wallet:', e);
      }

      const hasBalance = parseFloat(balanceResult.balanceEth) > 0;

      recoveryState.update(s => ({
        ...s,
        privatekey: {
          ...s.privatekey,
          totalChecked: s.privatekey.totalChecked + 1,
          foundCount: hasBalance ? s.privatekey.foundCount + 1 : s.privatekey.foundCount,
          currentBalance: balanceResult.balanceEth,
          recentResults: [
            { address: wallet.address, privateKey: wallet.privateKey, balance: balanceResult.balanceEth },
            ...s.privatekey.recentResults.slice(0, 9)
          ]
        }
      }));

      const newState = get(recoveryState);
      if (newState.privatekey.isRunning) {
        setTrackedTimeout(runPrivateKeyCheck, 1000);
      }
    }
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : '네트워크 오류', stopPrivateKeyRecovery);
    setTrackedTimeout(() => {
      const s = get(recoveryState);
      if (s.privatekey.isRunning) runPrivateKeyCheck();
    }, 10000);
  }
}

export function startPrivateKeyRecovery(chars: string[]) {
  stopAllRecovery();

  const unknownCount = chars.filter(c => c === '').length;
  const total = BigInt(16) ** BigInt(unknownCount);
  const generator = privateKeyCombinationGenerator(chars);

  // Worker 인덱스 초기화
  privatekeyWorkerIndex = 0n;

  recoveryState.update(s => ({
    ...s,
    activeType: 'privatekey',
    privatekey: {
      ...s.privatekey,
      isRunning: true,
      chars,
      currentIndex: 0n,
      totalCombinations: total,
      generator
    }
  }));

  runPrivateKeyCheck();
}

export function stopPrivateKeyRecovery() {
  clearTimers();
  recoveryState.update(s => ({
    ...s,
    activeType: s.activeType === 'privatekey' ? null : s.activeType,
    privatekey: { ...s.privatekey, isRunning: false }
  }));
}

// 니모닉 단어 업데이트
export function updateMnemonicWord(index: number, word: string) {
  recoveryState.update(s => {
    const newWords = [...s.mnemonic.words];
    newWords[index] = word;
    return {
      ...s,
      mnemonic: { ...s.mnemonic, words: newWords }
    };
  });
}

// 프라이빗키 문자 업데이트
export function updatePrivateKeyChar(index: number, char: string) {
  recoveryState.update(s => {
    const newChars = [...s.privatekey.chars];
    newChars[index] = char;
    return {
      ...s,
      privatekey: { ...s.privatekey, chars: newChars }
    };
  });
}

// 프라이빗키 붙여넣기 (시작 인덱스부터, 빈 칸에만 채움)
export function pastePrivateKey(text: string, startIndex: number = 0) {
  let cleaned = text.toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '');

  recoveryState.update(s => {
    const newChars = [...s.privatekey.chars];
    let pasteIdx = 0;

    for (let i = startIndex; i < 64 && pasteIdx < cleaned.length; i++) {
      // 빈 칸에만 채움
      if (newChars[i] === '') {
        newChars[i] = cleaned[pasteIdx];
        pasteIdx++;
      }
    }

    return {
      ...s,
      privatekey: { ...s.privatekey, chars: newChars }
    };
  });
}

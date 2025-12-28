<script lang="ts">
  import { isValidMnemonicWord, getWordlistArray } from '$lib/utils/wallet';
  import { recoveryState, startMnemonicRecovery, stopMnemonicRecovery, updateMnemonicWord } from '$lib/stores/recovery';

  // 각 input별 독립 상태
  interface InputState {
    suggestions: string[];
    selectedIndex: number;
    isFocused: boolean;
  }

  let inputStates = $state<InputState[]>(
    Array.from({ length: 12 }, () => ({ suggestions: [], selectedIndex: 0, isFocused: false }))
  );

  const wordlist = getWordlistArray();
  let errorMessage = $state('');

  function isValidWord(word: string): boolean {
    if (!word.trim()) return true;
    return isValidMnemonicWord(word);
  }

  function validateInput(): boolean {
    for (let i = 0; i < 12; i++) {
      const word = $recoveryState.mnemonic.words[i].trim();
      if (word && !isValidMnemonicWord(word)) {
        errorMessage = `단어 ${i + 1}번 "${word}"은(는) 유효한 BIP39 단어가 아닙니다.`;
        return false;
      }
    }
    errorMessage = '';
    return true;
  }

  function handleInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.toLowerCase().replace(/[^a-z]/g, '');
    updateMnemonicWord(index, value);

    if (value.length > 0) {
      inputStates[index].suggestions = wordlist.filter(w => w.startsWith(value)).slice(0, 8);
      inputStates[index].selectedIndex = 0;
    } else {
      inputStates[index].suggestions = [];
    }
  }

  function handleFocus(index: number) {
    inputStates[index].isFocused = true;
    inputStates[index].selectedIndex = 0;
    const value = $recoveryState.mnemonic.words[index].trim().toLowerCase();
    if (value.length > 0) {
      inputStates[index].suggestions = wordlist.filter(w => w.startsWith(value)).slice(0, 8);
    } else {
      inputStates[index].suggestions = [];
    }
  }

  function handleBlur(index: number) {
    setTimeout(() => {
      inputStates[index].isFocused = false;
      inputStates[index].suggestions = [];
    }, 200);
  }

  function handleKeydown(index: number, event: KeyboardEvent) {
    const state = inputStates[index];
    if (state.suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        inputStates[index].selectedIndex = Math.min(state.selectedIndex + 1, state.suggestions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        inputStates[index].selectedIndex = Math.max(state.selectedIndex - 1, 0);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        selectSuggestion(index, state.suggestions[state.selectedIndex]);
      } else if (event.key === 'Escape') {
        inputStates[index].suggestions = [];
      }
    }
  }

  function selectSuggestion(index: number, word: string) {
    updateMnemonicWord(index, word);
    inputStates[index].suggestions = [];
    inputStates[index].isFocused = false;

    if (index < 11) {
      const nextIndex = index + 1;
      const nextInput = document.querySelector(`input[data-mnemonic-index="${nextIndex}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function toggleRecovery() {
    if ($recoveryState.mnemonic.isRunning) {
      stopMnemonicRecovery();
    } else {
      if (!validateInput()) return;
      startMnemonicRecovery([...$recoveryState.mnemonic.words]);
    }
  }

  function resetProgress() {
    recoveryState.update(s => ({
      ...s,
      mnemonic: {
        ...s.mnemonic,
        currentIndex: 0n,
        totalChecked: 0,
        foundCount: 0,
        currentMnemonic: '',
        currentAddress: '',
        currentBalance: ''
      }
    }));
  }
</script>

<div class="mnemonic-recovery">
  <h1>니모닉 복구</h1>
  <p class="description">알고 있는 니모닉 단어를 입력하고, 모르는 칸은 비워두세요. 영어만 입력 가능합니다.</p>

  <div class="word-grid">
    {#each $recoveryState.mnemonic.words as word, i}
      <div class="word-input-wrapper">
        <span class="word-number">{i + 1}</span>
        <input
          type="text"
          placeholder="단어"
          data-mnemonic-index={i}
          value={word}
          oninput={(e) => handleInput(i, e)}
          onfocus={() => handleFocus(i)}
          onblur={() => handleBlur(i)}
          onkeydown={(e) => handleKeydown(i, e)}
          disabled={$recoveryState.mnemonic.isRunning}
          class:filled={word.trim() && isValidWord(word)}
          class:invalid={word.trim() && !isValidWord(word)}
        />
        {#if inputStates[i].isFocused && inputStates[i].suggestions.length > 0}
          <div class="suggestions">
            {#each inputStates[i].suggestions as suggestion, si}
              <button
                type="button"
                class="suggestion-item"
                class:selected={si === inputStates[i].selectedIndex}
                onmousedown={() => selectSuggestion(i, suggestion)}
              >
                {suggestion}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if errorMessage}
    <div class="error-banner">{errorMessage}</div>
  {/if}

  <div class="control-panel">
    <button class="control-btn" class:running={$recoveryState.mnemonic.isRunning} onclick={toggleRecovery}>
      {$recoveryState.mnemonic.isRunning ? '⏹ 중지' : '▶ 시작'}
    </button>
    <button class="reset-btn" onclick={resetProgress} disabled={$recoveryState.mnemonic.isRunning}>
      🔄 진행 초기화
    </button>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">조회 수</span>
        <span class="stat-value">{$recoveryState.mnemonic.totalChecked.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">잔액 발견</span>
        <span class="stat-value found">{$recoveryState.mnemonic.foundCount}</span>
      </div>
    </div>
  </div>

  <div class="current-check">
    <h3>현재 조회 중</h3>
    {#if $recoveryState.mnemonic.currentAddress}
      <div class="info-row">
        <span class="label">니모닉</span>
        <span class="value mono small">{$recoveryState.mnemonic.currentMnemonic}</span>
      </div>
      <div class="info-row">
        <span class="label">주소</span>
        <span class="value mono">{$recoveryState.mnemonic.currentAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">잔액</span>
        <span class="value">{$recoveryState.mnemonic.currentBalance} ETH</span>
      </div>
    {:else}
      <p class="placeholder">시작 버튼을 눌러 복구를 시작하세요</p>
    {/if}
  </div>

  <div class="recent-results">
    <h3>최근 조회 기록</h3>
    {#if $recoveryState.mnemonic.recentResults.length > 0}
      <div class="results-list">
        {#each $recoveryState.mnemonic.recentResults as result}
          <div class="result-item">
            <div class="result-row">
              <span class="result-label">니모닉</span>
              <span class="result-value mono small">{result.mnemonic}</span>
            </div>
            <div class="result-row">
              <span class="result-label">주소</span>
              <span class="result-value mono">{result.address}</span>
            </div>
            <div class="result-row">
              <span class="result-label">프라이빗키</span>
              <span class="result-value mono small">{result.privateKey}</span>
            </div>
            <div class="result-row">
              <span class="result-label">잔액</span>
              <span class="result-value">{result.balance} ETH</span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="placeholder">아직 조회 기록이 없습니다</p>
    {/if}
  </div>
</div>

<style>
  .mnemonic-recovery {
    padding: 2rem;
  }

  h1 {
    font-size: 1.5rem;
    color: #1a1a2e;
    margin-bottom: 0.5rem;
  }

  .description {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .word-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .word-input-wrapper {
    position: relative;
  }

  .word-number {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: #888;
    font-weight: 600;
    z-index: 1;
  }

  .word-input-wrapper input {
    width: 100%;
    padding: 0.6rem 0.5rem 0.6rem 2rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .word-input-wrapper input:focus {
    border-color: #ff9a16;
    outline: none;
  }

  .word-input-wrapper input.filled {
    border-color: #22c55e;
    background: #f0fdf4;
  }

  .word-input-wrapper input.invalid {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .word-input-wrapper input:disabled {
    background: #f0f0f0;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 2px;
  }

  .suggestion-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: #1a1a2e;
    transition: background 0.1s;
  }

  .suggestion-item:hover,
  .suggestion-item.selected {
    background: #f0f4ff;
  }

  .suggestion-item:first-child {
    border-radius: 8px 8px 0 0;
  }

  .suggestion-item:last-child {
    border-radius: 0 0 8px 8px;
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .control-panel {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .control-btn {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    transition: all 0.2s;
  }

  .control-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }

  .control-btn.running {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .control-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .reset-btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    background: #fff;
    color: #495057;
    transition: all 0.2s;
  }

  .reset-btn:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .reset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .stats {
    display: flex;
    gap: 1.5rem;
    margin-left: auto;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #888;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a1a2e;
  }

  .stat-value.found {
    color: #22c55e;
  }

  .current-check {
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1rem;
    color: #1a1a2e;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.5rem 0;
    gap: 1rem;
  }

  .label {
    font-size: 0.9rem;
    color: #888;
    flex-shrink: 0;
  }

  .value {
    font-size: 0.9rem;
    color: #1a1a2e;
    font-weight: 500;
    text-align: right;
    word-break: break-all;
  }

  .mono {
    font-family: monospace;
  }

  .small {
    font-size: 0.75rem;
  }

  .placeholder {
    color: #aaa;
    font-size: 0.9rem;
    text-align: center;
    padding: 1rem;
  }

  .recent-results {
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #eee;
  }

  .result-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .result-row:last-child {
    margin-bottom: 0;
  }

  .result-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
    font-weight: 600;
  }

  .result-value {
    font-size: 0.85rem;
    color: #1a1a2e;
    word-break: break-all;
  }

  .result-value.small {
    font-size: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    h1, h3 {
      color: #f0f0f0;
    }

    .description {
      color: #999;
    }

    .word-input-wrapper input {
      background: #2a2a3e;
      border-color: #3a3a4e;
      color: #f0f0f0;
    }

    .word-input-wrapper input.filled {
      background: #1a3a2e;
      border-color: #22c55e;
    }

    .word-input-wrapper input.invalid {
      background: #3a1a1a;
      border-color: #ef4444;
    }

    .suggestions {
      background: #2a2a3e;
      border-color: #3a3a4e;
    }

    .suggestion-item {
      color: #f0f0f0;
    }

    .suggestion-item:hover,
    .suggestion-item.selected {
      background: #3a3a4e;
    }

    .stat-value {
      color: #f0f0f0;
    }

    .current-check, .recent-results {
      background: #2a2a3e;
    }

    h3 {
      border-bottom-color: #3a3a4e;
    }

    .value {
      color: #f0f0f0;
    }

    .reset-btn {
      background: #2a2a3e;
      border-color: #3a3a4e;
      color: #b0b0c0;
    }

    .result-item {
      background: #1a1a2e;
      border-color: #3a3a4e;
    }

    .result-value {
      color: #e0e0e0;
    }

    .error-banner {
      background: #3a1a1a;
      border-color: #5a2a2a;
    }
  }

  @media (max-width: 600px) {
    .word-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .stats {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }
  }
</style>

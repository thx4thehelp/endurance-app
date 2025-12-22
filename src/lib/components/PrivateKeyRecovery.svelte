<script lang="ts">
  import { recoveryState, startPrivateKeyRecovery, stopPrivateKeyRecovery, updatePrivateKeyChar, pastePrivateKey } from '$lib/stores/recovery';

  let focusedIndex = $state<number | null>(null);
  let suggestions = $state<string[]>([]);
  let selectedSuggestionIndex = $state(0);
  let errorMessage = $state('');

  const HEX_CHARS = '0123456789abcdef';
  const HEX_ARRAY = HEX_CHARS.split('');

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';

    // 현재 포커스된 input에서 인덱스 가져오기
    const activeElement = document.activeElement as HTMLInputElement;
    const currentIndex = activeElement?.dataset?.pkIndex
      ? parseInt(activeElement.dataset.pkIndex)
      : (focusedIndex ?? 0);

    pastePrivateKey(pastedText, currentIndex);
  }

  function isValidHex(char: string): boolean {
    if (!char.trim()) return true;
    return HEX_CHARS.includes(char.toLowerCase());
  }

  function validateInput(): boolean {
    for (let i = 0; i < 64; i++) {
      const char = $recoveryState.privatekey.chars[i].trim().toLowerCase();
      if (char && !HEX_CHARS.includes(char)) {
        errorMessage = `${i + 1}번째 문자 "${char}"은(는) 유효한 16진수가 아닙니다. (0-9, a-f만 가능)`;
        return false;
      }
    }
    errorMessage = '';
    return true;
  }

  function handleInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.toLowerCase().replace(/[^0-9a-f]/g, '');

    if (value.length > 1) {
      value = value.slice(-1);
    }

    updatePrivateKeyChar(index, value);

    if (value.length > 0) {
      suggestions = HEX_ARRAY.filter(h => h.startsWith(value));
      selectedSuggestionIndex = 0;
    } else {
      suggestions = HEX_ARRAY;
    }
  }

  function handleFocus(index: number) {
    focusedIndex = index;
    const value = $recoveryState.privatekey.chars[index].trim();
    if (value.length > 0) {
      suggestions = HEX_ARRAY.filter(h => h.startsWith(value));
    } else {
      suggestions = HEX_ARRAY;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      focusedIndex = null;
      suggestions = [];
    }, 200);
  }

  function handleKeydown(index: number, event: KeyboardEvent) {
    if (suggestions.length > 0 && focusedIndex === index) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        selectSuggestion(index, suggestions[selectedSuggestionIndex]);
      } else if (event.key === 'Escape') {
        suggestions = [];
        focusedIndex = null;
      }
    }

    if (event.key === 'Backspace' && !$recoveryState.privatekey.chars[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-pk-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  function selectSuggestion(index: number, char: string) {
    updatePrivateKeyChar(index, char);
    suggestions = [];
    focusedIndex = null;

    if (index < 63) {
      const nextInput = document.querySelector(`input[data-pk-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  function toggleRecovery() {
    if ($recoveryState.privatekey.isRunning) {
      stopPrivateKeyRecovery();
    } else {
      if (!validateInput()) return;
      startPrivateKeyRecovery([...$recoveryState.privatekey.chars]);
    }
  }

  function resetProgress() {
    recoveryState.update(s => ({
      ...s,
      privatekey: {
        ...s.privatekey,
        currentIndex: 0n,
        totalChecked: 0,
        foundCount: 0,
        currentKey: '',
        currentAddress: '',
        currentBalance: ''
      }
    }));
  }
</script>

<div class="privatekey-recovery">
  <h1>프라이빗키 복구</h1>
  <p class="description">알고 있는 프라이빗키 문자(0-9, a-f)를 입력하고, 모르는 칸은 비워두세요.</p>

  <div class="char-grid" onpaste={handlePaste}>
    {#each $recoveryState.privatekey.chars as char, i}
      <div class="char-input-wrapper">
        <input
          type="text"
          maxlength="1"
          data-pk-index={i}
          value={char}
          oninput={(e) => handleInput(i, e)}
          onfocus={() => handleFocus(i)}
          onblur={handleBlur}
          onkeydown={(e) => handleKeydown(i, e)}
          disabled={$recoveryState.privatekey.isRunning}
          class:filled={char.trim() && isValidHex(char)}
          class:invalid={char.trim() && !isValidHex(char)}
          placeholder="_"
        />
        {#if focusedIndex === i && suggestions.length > 0}
          <div class="suggestions">
            {#each suggestions as suggestion, si}
              <button
                type="button"
                class="suggestion-item"
                class:selected={si === selectedSuggestionIndex}
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
    <button class="control-btn" class:running={$recoveryState.privatekey.isRunning} onclick={toggleRecovery}>
      {$recoveryState.privatekey.isRunning ? '⏹ 중지' : '▶ 시작'}
    </button>
    <button class="reset-btn" onclick={resetProgress} disabled={$recoveryState.privatekey.isRunning}>
      🔄 진행 초기화
    </button>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">조회 수</span>
        <span class="stat-value">{$recoveryState.privatekey.totalChecked.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">잔액 발견</span>
        <span class="stat-value found">{$recoveryState.privatekey.foundCount}</span>
      </div>
    </div>
  </div>

  <div class="current-check">
    <h3>현재 조회 중</h3>
    {#if $recoveryState.privatekey.currentAddress}
      <div class="info-row">
        <span class="label">프라이빗키</span>
        <span class="value mono small">{$recoveryState.privatekey.currentKey}</span>
      </div>
      <div class="info-row">
        <span class="label">주소</span>
        <span class="value mono">{$recoveryState.privatekey.currentAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">잔액</span>
        <span class="value">{$recoveryState.privatekey.currentBalance} ETH</span>
      </div>
    {:else}
      <p class="placeholder">시작 버튼을 눌러 복구를 시작하세요</p>
    {/if}
  </div>

  <div class="recent-results">
    <h3>최근 조회 기록</h3>
    {#if $recoveryState.privatekey.recentResults.length > 0}
      <div class="results-list">
        {#each $recoveryState.privatekey.recentResults as result}
          <div class="result-item">
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
  .privatekey-recovery {
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
    margin-bottom: 1rem;
  }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 4px;
    margin-bottom: 1.5rem;
  }

  .char-input-wrapper {
    position: relative;
  }

  .char-input-wrapper input {
    width: 100%;
    aspect-ratio: 1;
    text-align: center;
    font-family: monospace;
    font-size: 0.9rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    padding: 0;
    text-transform: lowercase;
  }

  .char-input-wrapper input:focus {
    border-color: #ff9a16;
    outline: none;
  }

  .char-input-wrapper input.filled {
    border-color: #22c55e;
    background: #f0fdf4;
  }

  .char-input-wrapper input.invalid {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .char-input-wrapper input:disabled {
    background: #f0f0f0;
  }

  .char-input-wrapper input::placeholder {
    color: #ccc;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 4px;
    min-width: 120px;
    margin-top: 2px;
  }

  .suggestion-item {
    padding: 0.4rem;
    text-align: center;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: monospace;
    color: #1a1a2e;
    border-radius: 4px;
    transition: background 0.1s;
  }

  .suggestion-item:hover,
  .suggestion-item.selected {
    background: #f0f4ff;
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

    .char-input-wrapper input {
      background: #2a2a3e;
      border-color: #3a3a4e;
      color: #f0f0f0;
    }

    .char-input-wrapper input.filled {
      background: #1a3a2e;
      border-color: #22c55e;
    }

    .char-input-wrapper input.invalid {
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

  @media (max-width: 800px) {
    .char-grid {
      grid-template-columns: repeat(8, 1fr);
    }

    .stats {
      margin-left: 0;
      width: 100%;
      justify-content: center;
    }
  }
</style>

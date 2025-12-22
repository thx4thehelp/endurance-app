<script lang="ts">
  import { recoveryState, startRandomRecovery, stopRandomRecovery } from '$lib/stores/recovery';

  function toggleTest() {
    if ($recoveryState.random.isRunning) {
      stopRandomRecovery();
    } else {
      startRandomRecovery();
    }
  }
</script>

<div class="random-test">
  <h1>무작위 테스트</h1>
  <p class="description">무작위로 지갑을 생성하고 잔액을 조회합니다. 모든 결과가 저장됩니다.</p>

  <div class="control-panel">
    <button class="control-btn" class:running={$recoveryState.random.isRunning} onclick={toggleTest}>
      {$recoveryState.random.isRunning ? '⏹ 중지' : '▶ 시작'}
    </button>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">조회 수</span>
        <span class="stat-value">{$recoveryState.random.totalChecked.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">잔액 발견</span>
        <span class="stat-value found">{$recoveryState.random.foundCount}</span>
      </div>
    </div>
  </div>

  <div class="current-check">
    <h3>현재 조회 중</h3>
    {#if $recoveryState.random.currentAddress}
      <div class="info-row">
        <span class="label">주소</span>
        <span class="value mono">{$recoveryState.random.currentAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">잔액</span>
        <span class="value">{$recoveryState.random.currentBalance} ETH</span>
      </div>
    {:else}
      <p class="placeholder">시작 버튼을 눌러 테스트를 시작하세요</p>
    {/if}
  </div>

  <div class="recent-results">
    <h3>최근 조회 기록</h3>
    {#if $recoveryState.random.recentResults.length > 0}
      <div class="results-list">
        {#each $recoveryState.random.recentResults as result}
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
  .random-test {
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

  .control-panel {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
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

  .control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }

  .control-btn.running {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .control-btn.running:hover {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .stats {
    display: flex;
    gap: 1.5rem;
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

  .current-check, .recent-results {
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
    align-items: center;
    padding: 0.5rem 0;
  }

  .label {
    font-size: 0.9rem;
    color: #888;
  }

  .value {
    font-size: 0.9rem;
    color: #1a1a2e;
    font-weight: 500;
  }

  .mono {
    font-family: monospace;
    font-size: 0.85rem;
  }

  .placeholder {
    color: #aaa;
    font-size: 0.9rem;
    text-align: center;
    padding: 1rem;
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
    h1 {
      color: #f0f0f0;
    }

    .description {
      color: #999;
    }

    .stat-value {
      color: #f0f0f0;
    }

    .current-check, .recent-results {
      background: #2a2a3e;
    }

    h3 {
      color: #f0f0f0;
      border-bottom-color: #3a3a4e;
    }

    .value {
      color: #f0f0f0;
    }

    .result-item {
      background: #1a1a2e;
      border-color: #3a3a4e;
    }

    .result-value {
      color: #e0e0e0;
    }
  }
</style>

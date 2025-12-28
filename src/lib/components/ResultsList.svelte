<script lang="ts">
  import { onMount } from 'svelte';
  import { type WalletResult } from '$lib/stores/app';
  import { getAllWallets, getWalletsWithBalance, getTotalCount, getBalanceCount, exportAllWallets, exportWalletsWithBalance, searchWallets, searchWalletsCount, type WalletRecord } from '$lib/db';

  let results = $state<WalletRecord[]>([]);
  let showOnlyWithBalance = $state(false);
  let currentPage = $state(1);
  let itemsPerPage = 10;
  let totalCount = $state(0);
  let balanceCount = $state(0);
  let isLoading = $state(true);
  let searchQuery = $state('');
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  let displayCount = $derived(searchQuery ? totalCount : (showOnlyWithBalance ? balanceCount : totalCount));
  let totalPages = $derived(Math.ceil(displayCount / itemsPerPage));
  let copiedId = $state<string | null>(null);

  let countsLoaded = false;

  async function loadCounts() {
    if (!countsLoaded) {
      [totalCount, balanceCount] = await Promise.all([
        getTotalCount(),
        getBalanceCount()
      ]);
      countsLoaded = true;
    }
  }

  async function loadData(refreshCounts = false) {
    isLoading = true;
    const offset = (currentPage - 1) * itemsPerPage;

    try {
      if (refreshCounts) {
        countsLoaded = false;
      }

      if (searchQuery) {
        results = await searchWallets(searchQuery, itemsPerPage, offset);
        totalCount = await searchWalletsCount(searchQuery);
      } else if (showOnlyWithBalance) {
        results = await getWalletsWithBalance(itemsPerPage, offset);
        await loadCounts();
      } else {
        results = await getAllWallets(itemsPerPage, offset);
        await loadCounts();
      }
    } catch (err) {
      console.error('Failed to load wallets:', err);
    }

    isLoading = false;
  }

  onMount(() => {
    loadData();
  });

  function handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    searchQuery = input.value;

    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadData();
    }, 300);
  }

  function clearSearch() {
    searchQuery = '';
    currentPage = 1;
    loadData();
  }

  async function toggleBalanceFilter() {
    showOnlyWithBalance = !showOnlyWithBalance;
    searchQuery = '';
    currentPage = 1;
    await loadData();
  }

  async function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      await loadData();
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getSourceLabel(source: string): string {
    switch (source) {
      case 'random': return '무작위';
      case 'mnemonic': return '니모닉';
      case 'privatekey': return 'PK';
      default: return source;
    }
  }

  function getSourceClass(source: string): string {
    switch (source) {
      case 'random': return 'source-random';
      case 'mnemonic': return 'source-mnemonic';
      case 'privatekey': return 'source-privatekey';
      default: return '';
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedId = id;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function exportResults() {
    const data = showOnlyWithBalance
      ? await exportWalletsWithBalance()
      : await exportAllWallets();

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endurance-wallets-${showOnlyWithBalance ? 'balance-' : ''}${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="results-list">
  <div class="header">
    <h1>복구 리스트</h1>
    <div class="header-actions">
      <span class="total-count">
        총 {displayCount.toLocaleString()}개
        {#if showOnlyWithBalance && !searchQuery}
          <span class="filter-indicator">(잔액 보유)</span>
        {/if}
        {#if searchQuery}
          <span class="filter-indicator">(검색 결과)</span>
        {/if}
      </span>
      {#if totalCount > 0 || balanceCount > 0}
        <button
          class="filter-btn"
          class:active={showOnlyWithBalance}
          onclick={toggleBalanceFilter}
          disabled={!!searchQuery}
        >
          {showOnlyWithBalance ? '전체 보기' : `잔액 보유만 (${balanceCount.toLocaleString()})`}
        </button>
        <button class="export-btn" onclick={exportResults}>
          내보내기
        </button>
      {/if}
    </div>
  </div>

  <div class="search-bar">
    <input
      type="text"
      placeholder="주소 또는 프라이빗키로 검색..."
      value={searchQuery}
      oninput={handleSearch}
      class="search-input"
    />
    {#if searchQuery}
      <button class="clear-btn" onclick={clearSearch}>✕</button>
    {/if}
  </div>

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>로딩 중...</p>
    </div>
  {:else if totalCount === 0 && balanceCount === 0 && !searchQuery}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>저장된 지갑이 없습니다</h3>
      <p>지갑이 발견되면 자동으로 저장됩니다.</p>
    </div>
  {:else if searchQuery && results.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>검색 결과가 없습니다</h3>
      <p>다른 검색어로 시도해보세요.</p>
      <button class="show-all-btn" onclick={clearSearch}>전체 보기</button>
    </div>
  {:else if showOnlyWithBalance && balanceCount === 0}
    <div class="empty-state">
      <div class="empty-icon">💰</div>
      <h3>잔액이 있는 지갑이 없습니다</h3>
      <p>잔액이 발견되면 여기에 표시됩니다.</p>
      <button class="show-all-btn" onclick={toggleBalanceFilter}>전체 보기</button>
    </div>
  {:else}
    <div class="results-container">
      {#each results as result}
        <div class="wallet-card">
          <div class="card-header">
            <span class="source-badge {getSourceClass(result.source)}">
              {getSourceLabel(result.source)}
            </span>
            <span class="timestamp">{formatDate(result.timestamp)}</span>
          </div>

          <div class="card-body">
            <div class="info-group">
              <div class="field-header">
                <span class="field-label">주소</span>
                <button
                  class="icon-btn"
                  class:copied={copiedId === result.id + '-addr'}
                  onclick={() => copyToClipboard(result.address, result.id + '-addr')}
                  title="주소 복사"
                >
                  {copiedId === result.id + '-addr' ? '✓' : '📋'}
                </button>
              </div>
              <span class="value mono full-width">{result.address}</span>
            </div>

            <div class="info-group">
              <div class="field-header">
                <span class="field-label">프라이빗키</span>
                <button
                  class="icon-btn"
                  class:copied={copiedId === result.id + '-key'}
                  onclick={() => copyToClipboard(result.privateKey, result.id + '-key')}
                  title="프라이빗키 복사"
                >
                  {copiedId === result.id + '-key' ? '✓' : '🔑'}
                </button>
              </div>
              <span class="value mono full-width small">{result.privateKey}</span>
            </div>

            <div class="balance-row">
              <span class="balance-label">잔액</span>
              <span class="balance-value" class:has-balance={parseFloat(result.balanceEth) > 0}>
                {result.balanceEth} ETH
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="page-btn"
          onclick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        {#each Array(Math.min(totalPages, 10)) as _, i}
          {@const pageNum = currentPage <= 5 ? i + 1 :
            currentPage >= totalPages - 4 ? totalPages - 9 + i :
            currentPage - 4 + i}
          {#if pageNum >= 1 && pageNum <= totalPages}
            <button
              class="page-btn"
              class:active={currentPage === pageNum}
              onclick={() => goToPage(pageNum)}
            >
              {pageNum}
            </button>
          {/if}
        {/each}

        <button
          class="page-btn"
          onclick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .results-list {
    padding: 1.5rem;
    max-width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    color: #1a1a2e;
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .total-count {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
  }

  .filter-indicator {
    color: #22c55e;
    font-weight: 600;
  }

  .search-bar {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .search-input:focus {
    border-color: #ff9a16;
    outline: none;
  }

  .clear-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    color: #888;
    padding: 0.25rem;
  }

  .clear-btn:hover {
    color: #333;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    border: 2px solid #22c55e;
    border-radius: 8px;
    cursor: pointer;
    background: #fff;
    color: #22c55e;
    transition: all 0.2s;
  }

  .filter-btn:hover:not(:disabled) {
    background: #f0fdf4;
  }

  .filter-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .filter-btn.active {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-color: transparent;
    color: white;
  }

  .filter-btn.active:hover:not(:disabled) {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  }

  .export-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #ffef39 0%, #ff9a16 100%);
    color: #1a1a2e;
    transition: all 0.2s;
  }

  .export-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 154, 22, 0.4);
  }

  .show-all-btn {
    margin-top: 1rem;
    padding: 0.5rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #ffef39 0%, #ff9a16 100%);
    color: #1a1a2e;
    transition: all 0.2s;
  }

  .show-all-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 154, 22, 0.4);
  }

  .loading-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #ff9a16;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    color: #1a1a2e;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #888;
    font-size: 0.9rem;
  }

  .results-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .wallet-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: all 0.2s;
    border: 1px solid #eee;
  }

  .wallet-card:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
  }

  .source-badge {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .source-random {
    background: linear-gradient(135deg, #ffef39 0%, #ff9a16 100%);
    color: #1a1a2e;
  }

  .source-mnemonic {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
  }

  .source-privatekey {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .timestamp {
    font-size: 0.75rem;
    color: #888;
  }

  .card-body {
    padding: 1rem;
  }

  .info-group {
    margin-bottom: 1rem;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .field-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .value {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 0.8rem;
    color: #1a1a2e;
    word-break: break-all;
    line-height: 1.4;
  }

  .value.full-width {
    display: block;
    background: #f8f9fa;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #eee;
  }

  .value.small {
    font-size: 0.7rem;
  }

  .mono {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  .icon-btn {
    padding: 0.25rem 0.4rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    background: #fff;
    font-size: 0.7rem;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    background: #f0f0f0;
    border-color: #ccc;
  }

  .icon-btn.copied {
    background: #dcfce7;
    border-color: #22c55e;
    color: #16a34a;
  }

  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid #f0f0f0;
  }

  .balance-label {
    font-size: 0.75rem;
    color: #888;
    font-weight: 600;
  }

  .balance-value {
    font-size: 1rem;
    font-weight: 700;
    color: #888;
  }

  .balance-value.has-balance {
    color: #22c55e;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
    flex-wrap: wrap;
  }

  .page-btn {
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    background: #fff;
    font-size: 0.9rem;
    color: #495057;
    transition: all 0.2s;
    font-weight: 500;
  }

  .page-btn:hover:not(:disabled) {
    background: #f0f0f0;
    border-color: #ccc;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-btn.active {
    background: linear-gradient(135deg, #ffef39 0%, #ff9a16 100%);
    border-color: transparent;
    color: #1a1a2e;
  }

  @media (prefers-color-scheme: dark) {
    h1 {
      color: #f0f0f0;
    }

    .search-input {
      background: #2a2a3e;
      border-color: #3a3a4e;
      color: #f0f0f0;
    }

    .search-input::placeholder {
      color: #888;
    }

    .clear-btn {
      color: #888;
    }

    .clear-btn:hover {
      color: #f0f0f0;
    }

    .loading-state, .empty-state {
      background: #2a2a3e;
    }

    .loading-state p {
      color: #b0b0c0;
    }

    .spinner {
      border-color: #3a3a4e;
      border-top-color: #ff9a16;
    }

    .empty-state h3 {
      color: #f0f0f0;
    }

    .wallet-card {
      background: #2a2a3e;
      border-color: #3a3a4e;
    }

    .card-header {
      background: #252538;
      border-bottom-color: #3a3a4e;
    }

    .card-body {
      background: #2a2a3e;
    }

    .value {
      color: #e0e0e0;
    }

    .value.full-width {
      background: #1a1a2e;
      border-color: #3a3a4e;
    }

    .icon-btn {
      background: #3a3a4e;
      border-color: #4a4a5e;
      color: #b0b0c0;
    }

    .icon-btn:hover {
      background: #4a4a5e;
    }

    .balance-row {
      border-top-color: #3a3a4e;
    }

    .page-btn {
      background: #2a2a3e;
      border-color: #3a3a4e;
      color: #b0b0c0;
    }

    .page-btn:hover:not(:disabled) {
      background: #3a3a4e;
    }

    .filter-btn {
      background: #2a2a3e;
      border-color: #22c55e;
    }

    .filter-btn:hover:not(:disabled) {
      background: #1a3a2e;
    }
  }

  @media (max-width: 600px) {
    .results-list {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-actions {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
    }
  }
</style>

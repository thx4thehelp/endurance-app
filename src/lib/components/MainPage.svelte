<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyIP, checkServerStatus } from '$lib/utils/wallet';

  let myIP = $state('Loading...');
  let serverOnline = $state<boolean | null>(null);
  let lastChecked = $state('');

  async function checkStatus() {
    myIP = await getMyIP();
    serverOnline = await checkServerStatus();
    lastChecked = new Date().toLocaleTimeString();
  }

  onMount(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="main-page">
  <h1>대시보드</h1>

  <div class="status-cards">
    <div class="card">
      <div class="card-header">
        <span class="card-icon">🌐</span>
        <h3>내 IP 주소</h3>
      </div>
      <div class="card-body">
        <p class="ip-address">{myIP}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">📡</span>
        <h3>서버 상태</h3>
      </div>
      <div class="card-body">
        <div class="server-status">
          <span class="status-indicator" class:online={serverOnline === true} class:offline={serverOnline === false}></span>
          <span class="status-text">
            {#if serverOnline === null}
              확인 중...
            {:else if serverOnline}
              온라인
            {:else}
              오프라인
            {/if}
          </span>
        </div>
        <p class="last-checked">마지막 확인: {lastChecked}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-icon">⚙️</span>
        <h3>시스템 정보</h3>
      </div>
      <div class="card-body">
        <p><strong>RPC 엔드포인트:</strong></p>
        <p class="endpoint">api.endurance.work</p>
        <p><strong>조회 주기:</strong> 1초</p>
      </div>
    </div>
  </div>

  <div class="developer-card">
    <div class="card-header">
      <span class="card-icon">👨‍💻</span>
      <h3>개발자 정보</h3>
    </div>
    <div class="card-body developer-info">
      <div class="info-row">
        <span class="info-label">개발자</span>
        <span class="info-value">Endurance Team</span>
      </div>
      <div class="info-row">
        <span class="info-label">버전</span>
        <span class="info-value">1.0.0</span>
      </div>
      <div class="info-row">
        <span class="info-label">문의</span>
        <span class="info-value">support@endurance.work</span>
      </div>
      <div class="info-row">
        <span class="info-label">GitHub</span>
        <span class="info-value">github.com/endurance</span>
      </div>
    </div>
  </div>
</div>

<style>
  .main-page {
    padding: 2rem;
  }

  h1 {
    font-size: 1.5rem;
    color: #1a1a2e;
    margin-bottom: 1.5rem;
  }

  .status-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .card, .developer-card {
    background: #fff;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #eee;
  }

  .card-icon {
    font-size: 1.25rem;
  }

  .card-header h3 {
    font-size: 1rem;
    color: #1a1a2e;
    margin: 0;
  }

  .card-body p {
    margin: 0.5rem 0;
    color: #495057;
    font-size: 0.9rem;
  }

  .ip-address {
    font-size: 1.25rem !important;
    font-weight: 600;
    color: #667eea !important;
    font-family: monospace;
  }

  .server-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #aaa;
  }

  .status-indicator.online {
    background: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  }

  .status-indicator.offline {
    background: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  }

  .status-text {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1a1a2e;
  }

  .last-checked {
    font-size: 0.8rem !important;
    color: #888 !important;
    margin-top: 0.5rem !important;
  }

  .endpoint {
    font-family: monospace;
    background: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    display: inline-block;
  }

  .developer-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 0.9rem;
    color: #888;
  }

  .info-value {
    font-size: 0.9rem;
    color: #1a1a2e;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    h1 {
      color: #f0f0f0;
    }

    .card, .developer-card {
      background: #2a2a3e;
    }

    .card-header {
      border-bottom-color: #3a3a4e;
    }

    .card-header h3 {
      color: #f0f0f0;
    }

    .card-body p {
      color: #b0b0c0;
    }

    .status-text {
      color: #f0f0f0;
    }

    .endpoint {
      background: #1a1a2e;
      color: #f0f0f0;
    }

    .info-row {
      border-bottom-color: #3a3a4e;
    }

    .info-value {
      color: #f0f0f0;
    }
  }
</style>

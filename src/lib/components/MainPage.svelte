<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyIP, checkServerStatus } from '$lib/utils/wallet';

  let myIP = $state('Loading...');
  let serverOnline = $state<boolean | null>(null);
  let lastChecked = $state('');
  let showReadme = $state(false);
  let readmeContent = $state('');

  async function checkStatus() {
    myIP = await getMyIP();
    serverOnline = await checkServerStatus();
    lastChecked = new Date().toLocaleTimeString();
  }

  onMount(async () => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);

    // README 파일 로드
    try {
      const response = await fetch('/README.md');
      if (response.ok) {
        readmeContent = await response.text();
      } else {
        readmeContent = 'README.md 파일을 불러올 수 없습니다.';
      }
    } catch {
      readmeContent = 'README.md 파일을 불러올 수 없습니다.';
    }

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
      <span class="card-icon">ℹ️</span>
      <h3>프로그램 정보</h3>
    </div>
    <div class="card-body developer-info">
      <div class="info-row">
        <span class="info-label">개발자</span>
        <span class="info-value">함신승</span>
      </div>
      <div class="info-row">
        <span class="info-label">버전</span>
        <span class="info-value">v0.1.2</span>
      </div>
      <div class="info-row">
        <span class="info-label">문의</span>
        <span class="info-value">초고속 생성&조회 문의 010-8809-2943</span>
      </div>
      <div class="info-row">
        <span class="info-label">정보</span>
        <button class="view-readme-btn" onclick={() => showReadme = true}>보기</button>
      </div>
    </div>
  </div>

  {#if showReadme}
    <div class="modal-overlay" onclick={() => showReadme = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showReadme = false)}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>README</h2>
          <button class="close-btn" onclick={() => showReadme = false}>&times;</button>
        </div>
        <div class="modal-body">
          <pre>{readmeContent}</pre>
        </div>
      </div>
    </div>
  {/if}
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

  .view-readme-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .view-readme-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 700px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #1a1a2e;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #888;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #333;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .modal-body pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #333;
    margin: 0;
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

    .modal-content {
      background: #2a2a3e;
    }

    .modal-header {
      border-bottom-color: #3a3a4e;
    }

    .modal-header h2 {
      color: #f0f0f0;
    }

    .close-btn {
      color: #aaa;
    }

    .close-btn:hover {
      color: #fff;
    }

    .modal-body pre {
      color: #d0d0e0;
    }
  }
</style>

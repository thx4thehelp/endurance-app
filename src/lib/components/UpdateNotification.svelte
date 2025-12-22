<script lang="ts">
  import { onMount } from 'svelte';
  import { updateState, checkForUpdates, downloadAndInstall } from '$lib/updater';

  onMount(() => {
    // 앱 시작 후 3초 뒤에 업데이트 체크
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    return () => clearTimeout(timer);
  });

  function handleUpdate() {
    downloadAndInstall();
  }

  function dismiss() {
    updateState.update(s => ({ ...s, available: false }));
  }
</script>

{#if $updateState.available && !$updateState.downloading}
  <div class="update-banner">
    <div class="update-content">
      <span class="update-icon">🎉</span>
      <span class="update-text">
        새 버전 <strong>v{$updateState.version}</strong> 사용 가능!
      </span>
    </div>
    <div class="update-actions">
      <button class="update-btn" onclick={handleUpdate}>업데이트</button>
      <button class="dismiss-btn" onclick={dismiss}>나중에</button>
    </div>
  </div>
{/if}

{#if $updateState.downloading}
  <div class="update-banner downloading">
    <div class="update-content">
      <span class="update-icon">⬇️</span>
      <span class="update-text">업데이트 다운로드 중... {$updateState.progress}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {$updateState.progress}%"></div>
    </div>
  </div>
{/if}

{#if $updateState.error}
  <div class="update-banner error">
    <span class="update-text">{$updateState.error}</span>
    <button class="dismiss-btn" onclick={() => updateState.update(s => ({ ...s, error: '' }))}>닫기</button>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    padding: 0.75rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .update-banner.downloading {
    flex-direction: column;
    gap: 0.5rem;
  }

  .update-banner.error {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .update-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .update-icon {
    font-size: 1.2rem;
  }

  .update-text {
    font-size: 0.9rem;
  }

  .update-actions {
    display: flex;
    gap: 0.5rem;
  }

  .update-btn {
    background: white;
    color: #16a34a;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .update-btn:hover {
    transform: scale(1.05);
  }

  .dismiss-btn {
    background: transparent;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .dismiss-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: white;
    transition: width 0.3s;
  }
</style>

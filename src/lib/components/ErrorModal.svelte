<script lang="ts">
  import { errorModal } from '$lib/stores/app';

  function handleStop() {
    if ($errorModal.onStop) {
      $errorModal.onStop();
    }
    errorModal.set({ show: false, message: '', countdown: 0, onStop: undefined });
  }
</script>

{#if $errorModal.show}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-icon">⚠️</div>
      <h2>잔액 조회 실패</h2>
      <p class="message">{$errorModal.message}</p>
      <p class="countdown">{$errorModal.countdown}초 뒤 다시 시도합니다.</p>
      <div class="progress-bar">
        <div class="progress" style="width: {(10 - $errorModal.countdown) * 10}%"></div>
      </div>
      <button class="stop-btn" onclick={handleStop}>중단하기</button>
    </div>
  </div>
{/if}

<style>
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

  .modal {
    background: #fff;
    border-radius: 16px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1.25rem;
    color: #1a1a2e;
    margin-bottom: 0.75rem;
  }

  .message {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .countdown {
    font-size: 1.1rem;
    font-weight: 600;
    color: #ff9a16;
    margin-bottom: 1rem;
  }

  .progress-bar {
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background: linear-gradient(90deg, #ffef39 0%, #ff9a16 100%);
    transition: width 1s linear;
  }

  .stop-btn {
    margin-top: 1.5rem;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    transition: all 0.2s;
  }

  .stop-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  @media (prefers-color-scheme: dark) {
    .modal {
      background: #2a2a3e;
    }

    h2 {
      color: #f0f0f0;
    }

    .message {
      color: #b0b0c0;
    }

    .progress-bar {
      background: #3a3a4e;
    }
  }
</style>

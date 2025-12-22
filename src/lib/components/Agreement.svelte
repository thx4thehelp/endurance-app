<script lang="ts">
  import { agreed, saveAgreement } from '$lib/stores/app';

  let isChecked = $state(false);

  function handleAgree() {
    if (isChecked) {
      saveAgreement();
      agreed.set(true);
    }
  }
</script>

<div class="agreement-container">
  <div class="agreement-card">
    <img src="/logo.png" alt="Endurance Logo" class="logo" />
    <h1>Endurance Wallet Recovery</h1>

    <div class="notice">
      <h2>이용 안내 및 주의사항</h2>

      <div class="notice-content">
        <p><strong>1. 프로그램 목적</strong></p>
        <p>본 프로그램은 분실된 암호화폐 지갑의 복구를 돕기 위한 도구입니다.</p>

        <p><strong>2. 법적 책임</strong></p>
        <p>본 프로그램을 이용하여 타인의 지갑에 무단으로 접근하는 행위는 불법이며, 이로 인한 모든 법적 책임은 사용자 본인에게 있습니다.</p>

        <p><strong>3. 사용 범위</strong></p>
        <p>반드시 본인 소유의 지갑 복구 목적으로만 사용해야 합니다.</p>

        <p><strong>4. 데이터 보안</strong></p>
        <p>복구된 프라이빗 키와 니모닉은 로컬에만 저장되며, 외부로 전송되지 않습니다. 단, 사용자의 PC 보안은 사용자 책임입니다.</p>

        <p><strong>5. 면책 조항</strong></p>
        <p>개발자는 본 프로그램 사용으로 인해 발생하는 어떠한 손해에 대해서도 책임지지 않습니다.</p>
      </div>
    </div>

    <label class="checkbox-label">
      <input type="checkbox" bind:checked={isChecked} />
      <span>위 내용을 모두 읽었으며, 이에 동의합니다.</span>
    </label>

    <button
      class="start-btn"
      onclick={handleAgree}
      disabled={!isChecked}
    >
      시작하기
    </button>
  </div>
</div>

<style>
  .agreement-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .agreement-card {
    background: #fff;
    border-radius: 16px;
    padding: 2.5rem;
    max-width: 600px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
  }

  .logo {
    width: 80px;
    height: auto;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1.5rem;
    color: #1a1a2e;
    margin-bottom: 1.5rem;
  }

  .notice {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: left;
    margin-bottom: 1.5rem;
  }

  .notice h2 {
    font-size: 1rem;
    color: #1a1a2e;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e9ecef;
  }

  .notice-content {
    max-height: 300px;
    overflow-y: auto;
  }

  .notice-content p {
    font-size: 0.875rem;
    color: #495057;
    margin-bottom: 0.75rem;
    line-height: 1.6;
  }

  .notice-content p strong {
    color: #1a1a2e;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    cursor: pointer;
  }

  .checkbox-label input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .checkbox-label span {
    font-size: 0.9rem;
    color: #495057;
  }

  .start-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transition: all 0.3s;
  }

  .start-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }

  .start-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    .agreement-card {
      background: #2a2a3e;
    }

    h1 {
      color: #f0f0f0;
    }

    .notice {
      background: #1a1a2e;
    }

    .notice h2 {
      color: #f0f0f0;
      border-bottom-color: #3a3a4e;
    }

    .notice-content p {
      color: #b0b0c0;
    }

    .notice-content p strong {
      color: #f0f0f0;
    }

    .checkbox-label span {
      color: #b0b0c0;
    }
  }
</style>

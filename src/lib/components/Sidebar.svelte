<script lang="ts">
  import { currentPage } from '$lib/stores/app';

  const tabs = [
    { id: 'main', label: '메인', icon: '🏠' },
    { id: 'random', label: '무작위 테스트', icon: '🎲' },
    { id: 'mnemonic', label: '니모닉 복구', icon: '🔑' },
    { id: 'privatekey', label: '프라이빗키 복구', icon: '🔐' },
    { id: 'results', label: '복구 리스트', icon: '📋' }
  ];

  function navigateTo(id: string) {
    currentPage.set(id);
  }
</script>

<aside class="sidebar">
  <div class="logo-section">
    <img src="/favicon.png" alt="Logo" class="sidebar-logo" />
    <span class="logo-text">Endurance</span>
  </div>

  <nav class="nav">
    {#each tabs as tab}
      <button
        class="nav-item"
        class:active={$currentPage === tab.id}
        onclick={() => navigateTo(tab.id)}
      >
        <span class="nav-icon">{tab.icon}</span>
        <span class="nav-label">{tab.label}</span>
      </button>
    {/each}
  </nav>
</aside>

<style>
  .sidebar {
    width: 220px;
    min-height: 100vh;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0.5rem;
    margin-bottom: 2rem;
  }

  .sidebar-logo {
    width: 36px;
    height: auto;
  }

  .logo-text {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
  }

  .nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-item.active {
    background: linear-gradient(135deg, #ffef39 0%, #ff9a16 100%);
  }

  .nav-icon {
    font-size: 1.1rem;
  }

  .nav-label {
    font-size: 0.9rem;
    color: #fff;
    font-weight: 500;
  }
</style>

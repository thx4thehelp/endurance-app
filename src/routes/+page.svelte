<script lang="ts">
  import { onMount } from 'svelte';
  import { agreed, currentPage, totalWalletCount, balanceWalletCount } from '$lib/stores/app';
  import { initDatabase, getTotalCount, getBalanceCount } from '$lib/db';
  import Agreement from '$lib/components/Agreement.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MainPage from '$lib/components/MainPage.svelte';
  import RandomTest from '$lib/components/RandomTest.svelte';
  import MnemonicRecovery from '$lib/components/MnemonicRecovery.svelte';
  import PrivateKeyRecovery from '$lib/components/PrivateKeyRecovery.svelte';
  import ResultsList from '$lib/components/ResultsList.svelte';
  import ErrorModal from '$lib/components/ErrorModal.svelte';
  import UpdateNotification from '$lib/components/UpdateNotification.svelte';

  onMount(async () => {
    // 이용동의는 매번 앱 실행시 표시
    agreed.set(false);

    // SQLite DB 초기화
    await initDatabase();

    // 카운트 로드
    const total = await getTotalCount();
    const balance = await getBalanceCount();
    totalWalletCount.set(total);
    balanceWalletCount.set(balance);
  });
</script>

<ErrorModal />
<UpdateNotification />

{#if !$agreed}
  <Agreement />
{:else}
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      {#if $currentPage === 'main'}
        <MainPage />
      {:else if $currentPage === 'random'}
        <RandomTest />
      {:else if $currentPage === 'mnemonic'}
        <MnemonicRecovery />
      {:else if $currentPage === 'privatekey'}
        <PrivateKeyRecovery />
      {:else if $currentPage === 'results'}
        <ResultsList />
      {/if}
    </main>
  </div>
{/if}

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5;
  }

  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    background: #f0f2f5;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background: #1a1a2e;
    }

    .main-content {
      background: #1a1a2e;
    }
  }
</style>

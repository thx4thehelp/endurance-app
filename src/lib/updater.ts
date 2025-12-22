import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { writable } from 'svelte/store';

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  progress: number;
  version: string;
  error: string;
}

export const updateState = writable<UpdateState>({
  checking: false,
  available: false,
  downloading: false,
  progress: 0,
  version: '',
  error: ''
});

export async function checkForUpdates() {
  updateState.update(s => ({ ...s, checking: true, error: '' }));

  try {
    const update = await check();

    if (update) {
      updateState.update(s => ({
        ...s,
        checking: false,
        available: true,
        version: update.version
      }));
      return update;
    } else {
      updateState.update(s => ({ ...s, checking: false, available: false }));
      return null;
    }
  } catch (err) {
    updateState.update(s => ({
      ...s,
      checking: false,
      error: err instanceof Error ? err.message : '업데이트 확인 실패'
    }));
    return null;
  }
}

export async function downloadAndInstall() {
  updateState.update(s => ({ ...s, downloading: true, progress: 0 }));

  try {
    const update = await check();
    if (!update) return;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        updateState.update(s => ({ ...s, progress: 0 }));
      } else if (event.event === 'Progress') {
        const progress = event.data.contentLength
          ? Math.round((event.data.chunkLength / event.data.contentLength) * 100)
          : 0;
        updateState.update(s => ({ ...s, progress }));
      } else if (event.event === 'Finished') {
        updateState.update(s => ({ ...s, progress: 100 }));
      }
    });

    // 설치 완료 후 재시작
    await relaunch();
  } catch (err) {
    updateState.update(s => ({
      ...s,
      downloading: false,
      error: err instanceof Error ? err.message : '업데이트 설치 실패'
    }));
  }
}

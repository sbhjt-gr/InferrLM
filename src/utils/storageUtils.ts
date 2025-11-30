import * as FileSystem from 'expo-file-system';

const MIN_FREE_SPACE = 100 * 1024 * 1024;

export interface StorageInfo {
  freeSpace: number;
  totalSpace: number;
  hasEnoughSpace: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const info = await FileSystem.getFreeDiskStorageAsync();
    const total = await FileSystem.getTotalDiskCapacityAsync();
    return {
      freeSpace: info,
      totalSpace: total,
      hasEnoughSpace: info > MIN_FREE_SPACE,
    };
  } catch {
    return {
      freeSpace: 0,
      totalSpace: 0,
      hasEnoughSpace: false,
    };
  }
}

export async function hasEnoughSpace(needed: number): Promise<boolean> {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    const buffer = Math.max(MIN_FREE_SPACE, needed * 0.1);
    return free > (needed + buffer);
  } catch {
    return false;
  }
}

export async function checkBeforeDownload(size: number): Promise<{ok: boolean; msg?: string}> {
  const free = await FileSystem.getFreeDiskStorageAsync();
  const buffer = Math.max(MIN_FREE_SPACE, size * 0.1);
  const required = size + buffer;
  
  if (free < required) {
    const needed = formatBytes(required - free);
    return {
      ok: false,
      msg: `Need ${needed} more space`,
    };
  }
  
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

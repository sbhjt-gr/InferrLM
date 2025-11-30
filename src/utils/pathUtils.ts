import { Platform } from 'react-native';

export function normalizePath(path: string): string {
  if (!path) return path;
  return path.replace(/^file:\/\//, '');
}

export function toFileUri(path: string): string {
  if (!path) return path;
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

export function getFileName(path: string): string {
  if (!path) return '';
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

export function getDirectory(path: string): string {
  if (!path) return '';
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : '';
}

export function joinPath(...parts: string[]): string {
  return parts
    .map(p => normalizePath(p))
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');
}

export function isValidGgufPath(path: string): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.endsWith('.gguf');
}

export function normalizeForPlatform(path: string): string {
  const normalized = normalizePath(path);
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return normalized;
  }
  return normalized;
}

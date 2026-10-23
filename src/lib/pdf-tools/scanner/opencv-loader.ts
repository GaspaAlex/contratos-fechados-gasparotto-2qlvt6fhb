// src/lib/pdf-tools/scanner/opencv-loader.ts
/**
 * Backward compatibility facade for opencv-loader.
 * Delegates initialization check and start to the dedicated Web Worker.
 */
import { scanWorkerClient } from './opencv-worker-client'

export type OpenCvLoadState = 'idle' | 'loading_asset' | 'compiling_wasm' | 'ready' | 'error'

export function isOpenCvLoaded(): boolean {
  return scanWorkerClient.getInitialized()
}

export function getOpenCvState(): OpenCvLoadState {
  return scanWorkerClient.getInitialized() ? 'ready' : 'idle'
}

export async function loadOpenCv(): Promise<void> {
  return scanWorkerClient.ensureInitialized()
}

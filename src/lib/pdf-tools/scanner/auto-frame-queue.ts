/**
 * Serviço de Fila Sequencial de Processamento Automático de Fotografias da Câmera
 * Sistema de Gestão da Advocacia Gasparotto — Bloco 3.2
 *
 * Responsabilidades:
 * 1. Processamento sequencial em background (1 imagem por vez) via Web Worker do OpenCV já inicializado.
 * 2. Detecção dos 4 cantos físicos do documento (detectDocumentCorners) em resolução reduzida.
 * 3. Avaliação rigorosa de confiança:
 *    - Limiar de confiança >= 0.40 e status 'success' com detected === true.
 *    - Rejeição de fallback genérico / default corners como se fossem detecção válida.
 *    - Rejeição de quadriláteros que ocupem > 95% ou < 10% da área da imagem ou que toquem as bordas excessivamente.
 * 4. Aplicação de perspective warp sobre a resolução real da fotografia capturada se confiável.
 * 5. Se não confiável ou com erro: preservar fotografia original intacta e marcar como 'needs_review'.
 * 6. Preservação de identificadores estáveis e ordenação original independentemente do término assíncrono.
 * 7. Liberação correta de recursos e ImageBitmaps/Canvases intermediários na memória.
 */

import {
  detectDocumentCorners,
  applyPerspectiveWarp,
  type DetectionResult,
} from './document-detector'
import { scanWorkerClient } from './opencv-worker-client'
import type { DocumentCorners } from './perspective-math'

export type AutoProcessStatus = 'pending' | 'processing' | 'framed' | 'needs_review'

export interface AutoProcessPhotoInput {
  id: string
  name: string
  buffer: ArrayBuffer
  originalBuffer: ArrayBuffer
  previewUrl: string
  width: number
  height: number
  size: number
  type: 'image/jpeg'
}

export interface AutoProcessPhotoResult {
  id: string
  status: 'framed' | 'needs_review'
  detected: boolean
  confidence: number
  corners?: DocumentCorners
  buffer: ArrayBuffer
  previewUrl: string
  width: number
  height: number
  size: number
  durationMs: number
  error?: string
}

export interface AutoProcessQueueState {
  isProcessing: boolean
  activePhotoId: string | null
  pendingCount: number
  framedCount: number
  reviewCount: number
  totalCount: number
}

export type QueueStateListener = (state: AutoProcessQueueState) => void
export type PhotoResultListener = (result: AutoProcessPhotoResult) => void

/**
 * Limiar mínimo de confiança para considerar a detecção automática segura para recorte.
 * Valores abaixo de 0.40 preservam a fotografia original e marcam para revisão.
 */
export const AUTO_FRAME_CONFIDENCE_THRESHOLD = 0.4

class AutoFrameQueueService {
  private queue: AutoProcessPhotoInput[] = []
  private isProcessing = false
  private activeItem: AutoProcessPhotoInput | null = null
  private resultsMap = new Map<string, AutoProcessPhotoResult>()
  private stateListeners = new Set<QueueStateListener>()
  private resultListeners = new Set<PhotoResultListener>()

  // Contadores cumulativos da sessão atual
  private framedCount = 0
  private reviewCount = 0
  private totalCount = 0

  /**
   * Registra listener para mudanças no estado da fila
   */
  public onStateChange(listener: QueueStateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.getState())
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  /**
   * Registra listener para notificações de cada imagem processada
   */
  public onPhotoResult(listener: PhotoResultListener): () => void {
    this.resultListeners.add(listener)
    return () => {
      this.resultListeners.delete(listener)
    }
  }

  /**
   * Retorna o estado atual da fila
   */
  public getState(): AutoProcessQueueState {
    return {
      isProcessing: this.isProcessing,
      activePhotoId: this.activeItem?.id || null,
      pendingCount: this.queue.length + (this.activeItem ? 1 : 0),
      framedCount: this.framedCount,
      reviewCount: this.reviewCount,
      totalCount: this.totalCount,
    }
  }

  /**
   * Obtém o resultado processado de uma foto específica pelo ID
   */
  public getResult(id: string): AutoProcessPhotoResult | undefined {
    return this.resultsMap.get(id)
  }

  /**
   * Notifica todos os listeners de estado
   */
  private notifyState() {
    const state = this.getState()
    this.stateListeners.forEach((l) => {
      try {
        l(state)
      } catch (err) {
        console.error('[AutoFrameQueue] Erro no listener de estado:', err)
      }
    })
  }

  /**
   * Adiciona uma fotografia à fila de processamento automático.
   * Não bloqueia a thread de captura e inicia o processamento se estiver ociosa.
   */
  public enqueue(photo: AutoProcessPhotoInput) {
    this.totalCount++
    this.queue.push(photo)
    this.notifyState()

    // Disparar processamento em background se não houver tarefa ativa
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /**
   * Processa o próximo item da fila sequencialmente
   */
  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false
      this.activeItem = null
      this.notifyState()
      return
    }

    this.isProcessing = true
    const item = this.queue.shift()!
    this.activeItem = item
    this.notifyState()

    const tStart = performance.now()

    try {
      const result = await this.processPhoto(item)
      const elapsed = Math.round(performance.now() - tStart)
      result.durationMs = elapsed

      this.resultsMap.set(item.id, result)
      if (result.status === 'framed') {
        this.framedCount++
      } else {
        this.reviewCount++
      }

      // Notificar ouvintes com o resultado
      this.resultListeners.forEach((l) => {
        try {
          l(result)
        } catch (err) {
          console.error('[AutoFrameQueue] Erro no listener de resultado:', err)
        }
      })
    } catch (err) {
      console.error(`[AutoFrameQueue] Erro inesperado ao processar foto ${item.id}:`, err)
      const fallbackResult: AutoProcessPhotoResult = {
        id: item.id,
        status: 'needs_review',
        detected: false,
        confidence: 0,
        buffer: item.buffer,
        previewUrl: item.previewUrl,
        width: item.width,
        height: item.height,
        size: item.size,
        durationMs: Math.round(performance.now() - tStart),
        error: err instanceof Error ? err.message : String(err),
      }
      this.resultsMap.set(item.id, fallbackResult)
      this.reviewCount++

      this.resultListeners.forEach((l) => {
        try {
          l(fallbackResult)
        } catch (e) {
          console.error('[AutoFrameQueue] Erro no listener de resultado:', e)
        }
      })
    } finally {
      this.activeItem = null
      // Prossegue imediatamente para o próximo item
      this.processNext()
    }
  }

  /**
   * Executa a detecção e enquadramento de uma fotografia individual
   */
  private async processPhoto(photo: AutoProcessPhotoInput): Promise<AutoProcessPhotoResult> {
    // 1. Criar ImageBitmap ou HTMLImageElement para alimentar o detector
    let imgSource: HTMLImageElement | ImageBitmap | null = null
    let canvas: HTMLCanvasElement | null = null

    try {
      const blob = new Blob([photo.originalBuffer], { type: 'image/jpeg' })

      if (typeof createImageBitmap === 'function') {
        try {
          imgSource = await createImageBitmap(blob)
        } catch {
          imgSource = null
        }
      }

      if (!imgSource) {
        const imgUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.src = imgUrl
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Falha ao decodificar imagem para detecção'))
        })
        URL.revokeObjectURL(imgUrl)
        imgSource = img
      }

      const w = photo.width || ('width' in imgSource ? imgSource.width : 1920)
      const h = photo.height || ('height' in imgSource ? imgSource.height : 1080)

      // 2. Executar detecção dos cantos via Web Worker
      const requestId = `auto_detect_${photo.id}`
      const detection: DetectionResult = await detectDocumentCorners(imgSource, w, h, requestId)

      // 3. Avaliar critérios estritos de segurança para auto-enquadramento
      const isSafeToAutoFrame = this.evaluateDetectionConfidence(detection, w, h)

      if (isSafeToAutoFrame) {
        console.log(
          `[AutoFrameQueue] Foto ${photo.name} (${photo.id}): Detecção confiável (confiança ${(detection.confidence * 100).toFixed(1)}%). Aplicando perspectiva...`,
        )

        // 4. Aplicar perspectiva na resolução EFETIVA do documento original
        const warpedCanvas = await applyPerspectiveWarp(
          imgSource,
          detection.corners,
          w,
          h,
          `auto_warp_${photo.id}`,
        )

        // 5. Codificar JPEG de alta qualidade para o buffer ativo
        const warpedBlob = await new Promise<Blob | null>((resolve) => {
          warpedCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.94)
        })

        if (!warpedBlob) {
          throw new Error('Falha ao codificar canvas retificado')
        }

        const warpedBuffer = await warpedBlob.arrayBuffer()
        const newPreviewUrl = URL.createObjectURL(warpedBlob)

        // Registrar dimensões reais do canvas retificado ANTES de liberar memória
        const resultWidth = warpedCanvas.width
        const resultHeight = warpedCanvas.height

        // Limpar canvas
        warpedCanvas.width = 1
        warpedCanvas.height = 1

        return {
          id: photo.id,
          status: 'framed',
          detected: true,
          confidence: detection.confidence,
          corners: detection.corners,
          buffer: warpedBuffer,
          previewUrl: newPreviewUrl,
          width: resultWidth,
          height: resultHeight,
          size: warpedBlob.size,
          durationMs: detection.durationMs,
        }
      } else {
        console.log(
          `[AutoFrameQueue] Foto ${photo.name} (${photo.id}): Detecção incerta ou baixa confiança (${(detection.confidence * 100).toFixed(1)}%). Preservando original e marcando para revisão.`,
        )

        return {
          id: photo.id,
          status: 'needs_review',
          detected: detection.detected,
          confidence: detection.confidence,
          corners: detection.corners,
          buffer: photo.originalBuffer.slice(0),
          previewUrl: photo.previewUrl,
          width: w,
          height: h,
          size: photo.size,
          durationMs: detection.durationMs,
          error:
            detection.status === 'timeout'
              ? 'Tempo limite de detecção atingido'
              : detection.status === 'error'
                ? detection.error || 'Motor de detecção indisponível'
                : 'Bordas do documento incertas ou com reflexo/fundo complexo',
        }
      }
    } finally {
      // Liberar ImageBitmap se houver
      if (imgSource && 'close' in imgSource && typeof imgSource.close === 'function') {
        try {
          imgSource.close()
        } catch {
          // ignore
        }
      }
      if (canvas) {
        canvas.width = 1
        canvas.height = 1
      }
    }
  }

  /**
   * Avalia com precisão se os 4 cantos detectados representam um documento seguro
   */
  private evaluateDetectionConfidence(
    detection: DetectionResult,
    imgWidth: number,
    imgHeight: number,
  ): boolean {
    if (!detection.detected || detection.status !== 'success') {
      return false
    }

    if (detection.confidence < AUTO_FRAME_CONFIDENCE_THRESHOLD) {
      return false
    }

    const { topLeft, topRight, bottomRight, bottomLeft } = detection.corners

    // Calcular área do quadrilátero via fórmula de Shoelace
    const area =
      0.5 *
      Math.abs(
        topLeft.x * topRight.y +
          topRight.x * bottomRight.y +
          bottomRight.x * bottomLeft.y +
          bottomLeft.x * topLeft.y -
          (topRight.x * topLeft.y +
            bottomRight.x * topRight.y +
            bottomLeft.x * bottomRight.y +
            topLeft.x * bottomLeft.y),
      )

    const totalArea = imgWidth * imgHeight
    const areaRatio = area / totalArea

    // Se o quadrilátero ocupar menos de 10% da imagem ou mais de 96% (quase o frame inteiro),
    // é provável que seja ruído ou borda da própria foto, não documento com perspectiva válida
    if (areaRatio < 0.1 || areaRatio > 0.96) {
      return false
    }

    // Verificar se não é o quadrilátero de fallback (8% de inset padrão do getDefaultCorners)
    const insetX = imgWidth * 0.08
    const insetY = imgHeight * 0.08
    const isDefaultFallback =
      Math.abs(topLeft.x - insetX) < 2 &&
      Math.abs(topLeft.y - insetY) < 2 &&
      Math.abs(topRight.x - (imgWidth - insetX)) < 2 &&
      Math.abs(topRight.y - insetY) < 2

    if (isDefaultFallback) {
      return false
    }

    // Verificar se os 4 vértices formam proporções de lados aceitáveis para um documento
    const topW = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y)
    const botW = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y)
    const leftH = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y)
    const rightH = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y)

    const avgW = (topW + botW) / 2
    const avgH = (leftH + rightH) / 2

    if (avgW < 50 || avgH < 50) {
      return false
    }

    // Proporção de paralelismo entre lados opostos
    const ratioW = Math.min(topW, botW) / Math.max(topW, botW)
    const ratioH = Math.min(leftH, rightH) / Math.max(leftH, rightH)

    if (ratioW < 0.55 || ratioH < 0.55) {
      // Deformação excessiva ou quadrilátero bizarro
      return false
    }

    return true
  }

  /**
   * Verifica se ainda há qualquer operação pendente na fila (seja na fila de espera ou em processamento)
   */
  public hasPendingOperations(): boolean {
    return this.isProcessing || this.queue.length > 0 || this.activeItem !== null
  }

  /**
   * Retorna a contagem real de operações pendentes diretamente da fila
   */
  public getPendingCount(): number {
    return this.queue.length + (this.activeItem ? 1 : 0)
  }

  /**
   * Aguarda a conclusão de todos os itens atualmente pendentes na fila com timeout de segurança
   */
  public async waitForCompletion(timeoutMs = 15000): Promise<void> {
    if (!this.hasPendingOperations()) {
      return
    }

    const tStart = performance.now()
    return new Promise<void>((resolve) => {
      const check = () => {
        if (!this.hasPendingOperations()) {
          resolve()
        } else if (performance.now() - tStart > timeoutMs) {
          console.warn(`[AutoFrameQueue] waitForCompletion atingiu timeout de ${timeoutMs}ms`)
          resolve()
        } else {
          setTimeout(check, 60)
        }
      }
      check()
    })
  }

  /**
   * Cancela itens que ainda não começaram a ser processados (mantém o que já terminou)
   */
  public clearPendingQueue() {
    this.queue = []
    this.notifyState()
  }

  /**
   * Reseta toda a fila e contadores para nova sessão
   */
  public resetSession() {
    this.clearPendingQueue()
    this.resultsMap.clear()
    this.framedCount = 0
    this.reviewCount = 0
    this.totalCount = 0
    this.notifyState()
  }

  /**
   * Pré-aquece o Web Worker do OpenCV para que a primeira foto processe sem atraso perceptível
   */
  public preloadEngine() {
    if (!scanWorkerClient.isReady()) {
      scanWorkerClient.ensureInitialized().catch((err) => {
        console.warn('[AutoFrameQueue] Pré-carregamento do motor OpenCV falhou:', err)
      })
    }
  }
}

// Singleton exportado
export const autoFrameQueue = new AutoFrameQueueService()

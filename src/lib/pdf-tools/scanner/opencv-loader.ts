// src/lib/pdf-tools/scanner/opencv-loader.ts
/**
 * Gerenciador de carregamento lazy do motor OpenCV.js para digitalização de documentos.
 * Sistema de Gestão da Advocacia Gasparotto.
 *
 * Arquitetura e Diretrizes:
 * 1. Self-hosted & Local: Não depende de CDN externa em tempo de execução.
 * 2. Carregamento estritamente LAZY: só é acionado sob demanda quando o usuário abre
 *    a modal de edição de imagem (nunca na carga inicial da aplicação).
 * 3. Singleton estável: reutiliza a mesma instância após inicializada.
 * 4. Diagnóstico e métricas: mede separadamente o tempo de inicialização do motor.
 * 5. Fallback seguro: se o script local falhar, reporta falha discriminada (sem mascarar).
 */

declare global {
  interface Window {
    cv?: any
    _opencvInitDurationMs?: number
  }
}

export type OpenCvLoadState = 'unloaded' | 'loading' | 'ready' | 'failed'

let opencvPromise: Promise<any> | null = null
let currentLoadState: OpenCvLoadState = 'unloaded'
let lastLoadError: Error | null = null
let initDurationMs = 0

/**
 * Retorna se o OpenCV está pronto e com as funções principais disponíveis.
 */
export function isOpenCvLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.cv && (window.cv.Mat || typeof window.cv.imread === 'function'))
  )
}

/**
 * Retorna o estado atual do carregamento do motor de visão computacional.
 */
export function getOpenCvState(): {
  state: OpenCvLoadState
  error: Error | null
  initDurationMs: number
} {
  return {
    state: isOpenCvLoaded() ? 'ready' : currentLoadState,
    error: lastLoadError,
    initDurationMs,
  }
}

/**
 * Carrega o OpenCV.js sob demanda com garantia de singleton e suporte a self-hosted asset.
 */
export async function loadOpenCv(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('OpenCV só pode ser carregado no ambiente do navegador.')
  }

  if (isOpenCvLoaded()) {
    return window.cv
  }

  if (opencvPromise) {
    return opencvPromise
  }

  currentLoadState = 'loading'
  lastLoadError = null
  const startTime = performance.now()

  opencvPromise = new Promise<any>((resolve, reject) => {
    // Timeout de segurança (15 segundos)
    const timeoutTimer = setTimeout(() => {
      const timeoutErr = new Error(
        'Tempo limite excedido ao inicializar o motor de visão computacional OpenCV.js.',
      )
      currentLoadState = 'failed'
      lastLoadError = timeoutErr
      reject(timeoutErr)
    }, 15000)

    const handleReady = (readyCv: any) => {
      clearTimeout(timeoutTimer)
      initDurationMs = Math.round(performance.now() - startTime)
      window._opencvInitDurationMs = initDurationMs
      currentLoadState = 'ready'
      console.info(`[OpenCV.js] Motor inicializado com sucesso em ${initDurationMs}ms.`)
      resolve(readyCv)
    }

    const checkRuntime = (cvObj: any) => {
      if (cvObj && (cvObj.Mat || typeof cvObj.imread === 'function')) {
        handleReady(cvObj)
        return true
      }
      return false
    }

    // Configuração do objeto Module do Emscripten para localização de assets locais
    const baseOrigin = window.location.origin
    const localBasePath = `${baseOrigin}/opencv/`

    if (!window.cv) {
      window.cv = {
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return `${localBasePath}${path}`
          }
          return `${localBasePath}${path}`
        },
        onRuntimeInitialized: () => {
          if (checkRuntime(window.cv)) return
        },
        onAbort: (msg: string) => {
          console.warn('[OpenCV.js] Abort emitido:', msg)
        },
      }
    } else {
      const prevLocate = window.cv.locateFile
      window.cv.locateFile = (path: string, prefix?: string) => {
        if (path.endsWith('.wasm')) {
          return `${localBasePath}${path}`
        }
        return prevLocate ? prevLocate(path, prefix) : `${localBasePath}${path}`
      }

      const origInit = window.cv.onRuntimeInitialized
      window.cv.onRuntimeInitialized = () => {
        if (origInit) origInit()
        checkRuntime(window.cv)
      }
    }

    // Verificar se já havia sido inserido
    const existingScript = document.querySelector(
      'script[data-opencv-loader="true"]',
    ) as HTMLScriptElement | null

    if (existingScript && checkRuntime(window.cv)) {
      handleReady(window.cv)
      return
    }

    // Carregar via script tag do asset estático local da aplicação (/opencv/opencv.js)
    const script = existingScript || document.createElement('script')
    if (!existingScript) {
      script.setAttribute('data-opencv-loader', 'true')
      script.async = true
      script.defer = true
      script.src = `${localBasePath}opencv.js`
    }

    const verifyOrPoll = () => {
      if (checkRuntime(window.cv)) {
        return
      }
      if (window.cv && typeof window.cv.then === 'function') {
        window.cv
          .then((resolvedCv: any) => {
            window.cv = resolvedCv
            handleReady(resolvedCv)
          })
          .catch((err: any) => {
            clearTimeout(timeoutTimer)
            currentLoadState = 'failed'
            const wrappedErr = new Error(`Falha no runtime do OpenCV: ${err?.message || err}`)
            lastLoadError = wrappedErr
            reject(wrappedErr)
          })
        return
      }

      // Polling rápido para runtimeInitialized
      let attempts = 0
      const maxAttempts = 150 // 150 * 50ms = 7.5s pós load do script
      const pollTimer = setInterval(() => {
        attempts++
        if (checkRuntime(window.cv)) {
          clearInterval(pollTimer)
          return
        }
        if (attempts >= maxAttempts) {
          clearInterval(pollTimer)
          clearTimeout(timeoutTimer)
          currentLoadState = 'failed'
          const failErr = new Error(
            'Script OpenCV.js carregado, mas as funções do motor não foram expostas.',
          )
          lastLoadError = failErr
          reject(failErr)
        }
      }, 50)
    }

    script.onload = () => {
      verifyOrPoll()
    }

    script.onerror = () => {
      clearTimeout(timeoutTimer)
      currentLoadState = 'failed'
      const netErr = new Error(
        'Falha ao carregar o arquivo local /opencv/opencv.js. O motor de visão computacional não pôde ser iniciado.',
      )
      lastLoadError = netErr
      console.warn('[OpenCV.js]', netErr.message)
      reject(netErr)
    }

    if (!existingScript) {
      document.head.appendChild(script)
    } else {
      verifyOrPoll()
    }
  })

  return opencvPromise
}

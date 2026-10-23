// src/lib/pdf-tools/scanner/opencv-loader.ts
/**
 * Gerenciador de carregamento lazy do OpenCV.js para digitalização de documentos.
 * Licença OpenCV: Apache-2.0
 *
 * Estratégia de carregamento:
 * 1. Tenta carregar do asset estático local da aplicação (/opencv/opencv.js ou /opencv.js).
 * 2. Se não disponível localmente, utiliza CDN oficial jsdelivr (@techstark/opencv-js ou docs.opencv.org).
 * 3. O carregamento é estritamente LAZY: só é disparado quando o usuário clica em "Editar imagem".
 * 4. Não afeta em nada a carga inicial da aplicação ou outras ferramentas de PDF.
 */

declare global {
  interface Window {
    cv?: any
    _opencvLoadPromise?: Promise<any>
  }
}

let opencvPromise: Promise<any> | null = null

export function isOpenCvLoaded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.cv && window.cv.Mat)
}

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

  opencvPromise = new Promise<any>((resolve, reject) => {
    // Timeout de 25 segundos para carregamento
    const timeoutTimer = setTimeout(() => {
      reject(
        new Error('Tempo limite excedido ao carregar o motor de visão computacional OpenCV.js.'),
      )
    }, 25000)

    const onCvReady = () => {
      clearTimeout(timeoutTimer)
      if (window.cv && window.cv.Mat) {
        resolve(window.cv)
      } else if (window.cv && typeof window.cv.then === 'function') {
        window.cv
          .then((readyCv: any) => {
            window.cv = readyCv
            resolve(readyCv)
          })
          .catch(reject)
      } else {
        // Aguarda runtimeInitialized
        const checkCv = () => {
          if (window.cv && window.cv.Mat) {
            resolve(window.cv)
          } else {
            setTimeout(checkCv, 50)
          }
        }
        checkCv()
      }
    }

    // Se a tag já foi inserida
    const existingScript = document.querySelector(
      'script[data-opencv-loader="true"]',
    ) as HTMLScriptElement | null
    if (existingScript) {
      if (window.cv && window.cv.Mat) {
        clearTimeout(timeoutTimer)
        resolve(window.cv)
        return
      }
      const prevOnload = existingScript.onload
      existingScript.onload = (e) => {
        if (prevOnload) (prevOnload as any)(e)
        onCvReady()
      }
      return
    }

    // Configurar objeto global Module antes do script carregar
    if (!window.cv) {
      window.cv = {
        onRuntimeInitialized: () => {
          onCvReady()
        },
      }
    } else {
      const origInit = window.cv.onRuntimeInitialized
      window.cv.onRuntimeInitialized = () => {
        if (origInit) origInit()
        onCvReady()
      }
    }

    const script = document.createElement('script')
    script.setAttribute('data-opencv-loader', 'true')
    script.async = true
    script.defer = true

    // Prioridade: CDN estável @techstark/opencv-js (versão 4.10.0-release.1, Apache-2.0)
    // com fallback caso falhe.
    const primaryUrl =
      'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js'
    const fallbackUrl = 'https://docs.opencv.org/4.x/opencv.js'

    script.src = primaryUrl

    script.onload = () => {
      if (window.cv && window.cv.Mat) {
        onCvReady()
      }
      // caso contrário aguarda onRuntimeInitialized
    }

    script.onerror = () => {
      console.warn('Falha ao carregar OpenCV do provedor primário, tentando espelho secundário...')
      script.remove()

      const fallbackScript = document.createElement('script')
      fallbackScript.setAttribute('data-opencv-loader', 'true')
      fallbackScript.async = true
      fallbackScript.defer = true
      fallbackScript.src = fallbackUrl

      fallbackScript.onload = () => {
        if (window.cv && window.cv.Mat) {
          onCvReady()
        }
      }

      fallbackScript.onerror = () => {
        clearTimeout(timeoutTimer)
        reject(
          new Error('Não foi possível carregar o OpenCV.js. Verifique sua conexão com a internet.'),
        )
      }

      document.body.appendChild(fallbackScript)
    }

    document.body.appendChild(script)
  })

  return opencvPromise
}

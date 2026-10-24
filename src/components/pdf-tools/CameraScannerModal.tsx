import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  SwitchCamera,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Upload,
  Loader2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface CapturedPhoto {
  id: string
  file: File
  name: string
  size: number
  buffer: ArrayBuffer
  originalBuffer: ArrayBuffer
  originalSize: number
  type: 'image/jpeg'
  previewUrl: string
  width: number
  height: number
  validationStatus: 'valid'
  isEdited: boolean
}

interface CameraScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (photos: CapturedPhoto[]) => void
  initialCount?: number // Quantas imagens já existem na lista antes de abrir a câmera
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onComplete,
  initialCount = 0,
}: CameraScannerModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)
  const [cameraError, setCameraError] = useState<{
    type: 'permission' | 'notfound' | 'inuse' | 'unsupported' | 'other'
    message: string
  } | null>(null)

  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  // Lista de capturas desta sessão
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [lastCaptureFlash, setLastCaptureFlash] = useState(false)

  // Resolução efetiva da câmera ativa
  const [streamResolution, setStreamResolution] = useState<{
    width: number
    height: number
  } | null>(null)

  // Confirmação ao cancelar com capturas pendentes
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const nativeFallbackInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isCapturingRef = useRef(false)

  // Helper para liberar stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (err) {
          console.warn('Erro ao encerrar track:', err)
        }
      })
      streamRef.current = null
    }
    setStream(null)
    setStreamResolution(null)
  }, [])

  // Inicializar câmera com constraints preferenciais (NUNCA exact)
  const startCamera = useCallback(
    async (preferredDeviceId?: string, preferredFacing: 'environment' | 'user' = 'environment') => {
      // Verificar suporte técnico a getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          type: 'unsupported',
          message:
            'Seu navegador não oferece suporte à captura direta via câmera (getUserMedia). Utilize a captura nativa ou faça upload das imagens.',
        })
        return
      }

      setIsLoadingCamera(true)
      setCameraError(null)

      // Se já houver stream aberto, parar antes de abrir novo
      stopStream()

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1440 },
      }

      if (preferredDeviceId) {
        videoConstraints.deviceId = { ideal: preferredDeviceId }
      } else {
        videoConstraints.facingMode = { ideal: preferredFacing }
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        })

        streamRef.current = mediaStream
        setStream(mediaStream)

        // Monitorar evento 'ended' na track (interrupção física da câmera)
        const track = mediaStream.getVideoTracks()[0]
        if (track) {
          track.onended = () => {
            console.warn('[CameraScanner] Vídeo track foi encerrado pelo sistema')
            setCameraError({
              type: 'other',
              message:
                'O sinal da câmera foi interrompido pelo dispositivo ou por outro aplicativo.',
            })
          }

          // Ler resolução real do stream
          const settings = track.getSettings()
          if (settings.width && settings.height) {
            setStreamResolution({ width: settings.width, height: settings.height })
          }
        }

        // Vincular ao elemento de vídeo
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch((playErr) => {
                console.warn('[CameraScanner] Falha no auto-play do vídeo:', playErr)
              })
              const vidW = videoRef.current.videoWidth
              const vidH = videoRef.current.videoHeight
              if (vidW && vidH) {
                setStreamResolution({ width: vidW, height: vidH })
              }
            }
          }
        }

        // Enumerate devices para permitir alternar câmera
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoInputs = devices.filter((d) => d.kind === 'videoinput')
          setAvailableDevices(videoInputs)
        } catch (enumErr) {
          console.warn('[CameraScanner] Não foi possível enumerar dispositivos de vídeo:', enumErr)
        }

        setIsLoadingCamera(false)
      } catch (err: unknown) {
        setIsLoadingCamera(false)
        console.error('[CameraScanner] Erro ao obter câmera:', err)

        const errorObj = err as { name?: string; message?: string }
        const name = errorObj.name || ''

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError({
            type: 'permission',
            message:
              'Permissão de acesso à câmera negada. Para digitalizar documentos, autorize a câmera nas permissões do site ou do navegador (ícone de cadeado na barra de endereços).',
          })
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError({
            type: 'notfound',
            message: 'Nenhuma câmera foi encontrada no seu dispositivo.',
          })
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError({
            type: 'inuse',
            message:
              'A câmera pode estar em uso por outro aplicativo ou aba do navegador. Feche outros aplicativos e tente novamente.',
          })
        } else {
          setCameraError({
            type: 'other',
            message: `Não foi possível acessar a câmera: ${errorObj.message || 'Erro de inicialização'}.`,
          })
        }
      }
    },
    [stopStream],
  )

  // Iniciar câmera apenas quando a modal for aberta
  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId || undefined, facingMode)
    } else {
      stopStream()
      setCapturedPhotos([])
      setCameraError(null)
    }
  }, [isOpen, startCamera, selectedDeviceId, facingMode, stopStream])

  // Tratar visibilidade da página (visibilitychange) sem descartar capturas
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Aba perdeu foco ou celular foi bloqueado temporariamente
        // O stream pode ser pausado pelo SO, mantemos as fotos intactas
      } else if (isOpen && !streamRef.current && !cameraError) {
        // Retornou e se o stream estiver inativo, reinicia suavemente
        startCamera(selectedDeviceId || undefined, facingMode)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isOpen, startCamera, selectedDeviceId, facingMode, cameraError])

  // Cleanup absoluto ao desmontar componente
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  // Alternar entre câmeras frontal/traseira ou ciclo entre dispositivos disponíveis
  const handleToggleCamera = () => {
    if (availableDevices.length > 1) {
      const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId)
      const nextIndex = (currentIndex + 1) % availableDevices.length
      const nextDevice = availableDevices[nextIndex]
      setSelectedDeviceId(nextDevice.deviceId)
      startCamera(nextDevice.deviceId, facingMode)
    } else {
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
      setFacingMode(nextFacing)
      startCamera(undefined, nextFacing)
    }
  }

  // Capturar foto contínua
  const handleCapture = async () => {
    if (isCapturingRef.current || !videoRef.current || isCapturing) {
      return
    }

    const video = videoRef.current
    const w = video.videoWidth
    const h = video.videoHeight

    if (!w || !h) {
      console.warn('[CameraScanner] Vídeo sem dimensões válidas ainda')
      return
    }

    isCapturingRef.current = true
    setIsCapturing(true)
    const tStart = performance.now()

    try {
      // Efeito visual sutil de flash na tela
      setLastCaptureFlash(true)
      setTimeout(() => setLastCaptureFlash(false), 120)

      // Desenhar no canvas na resolução EFETIVA do stream de vídeo
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Falha ao obter contexto 2D do canvas de captura')
      }

      ctx.drawImage(video, 0, 0, w, h)

      // Gerar JPEG em memória com qualidade de documento (~0.92)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      })

      if (!blob) {
        throw new Error('Falha ao codificar imagem JPEG')
      }

      const buffer = await blob.arrayBuffer()
      const tEncode = performance.now() - tStart

      const pageNumber = initialCount + capturedPhotos.length + 1
      const photoName = `Captura ${pageNumber}.jpg`
      const file = new File([blob], photoName, { type: 'image/jpeg' })
      const previewUrl = URL.createObjectURL(blob)

      const newPhoto: CapturedPhoto = {
        id: `camera-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: photoName,
        size: blob.size,
        buffer,
        originalBuffer: buffer.slice(0),
        originalSize: blob.size,
        type: 'image/jpeg',
        previewUrl,
        width: w,
        height: h,
        validationStatus: 'valid',
        isEdited: false,
      }

      // Log técnico seguro (sem conteúdo sensível)
      console.log(
        `[CameraScanner] Captura realizada: ${w}x${h}px, codificação: ${Math.round(tEncode)}ms, páginas na sessão: ${capturedPhotos.length + 1}`,
      )

      setCapturedPhotos((prev) => [...prev, newPhoto])
    } catch (err) {
      console.error('[CameraScanner] Erro durante captura:', err)
    } finally {
      setIsCapturing(false)
      isCapturingRef.current = false
    }
  }

  // Refazer última captura
  const handleRedoLast = () => {
    if (capturedPhotos.length === 0) return
    setCapturedPhotos((prev) => {
      const last = prev[prev.length - 1]
      if (last?.previewUrl) {
        URL.revokeObjectURL(last.previewUrl)
      }
      return prev.slice(0, prev.length - 1)
    })
  }

  // Processar arquivos do fallback nativo (input capture="environment")
  const handleNativeFallbackFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer()
        const blob = new Blob([buffer], { type: file.type || 'image/jpeg' })
        const previewUrl = URL.createObjectURL(blob)

        // Obter dimensões reais
        let w = 1920
        let h = 1080
        try {
          const img = new Image()
          img.src = previewUrl
          await new Promise<void>((resolve) => {
            img.onload = () => {
              w = img.naturalWidth || 1920
              h = img.naturalHeight || 1080
              resolve()
            }
            img.onerror = () => resolve()
          })
        } catch {
          // Fallback silencioso
        }

        const pageNumber = initialCount + capturedPhotos.length + 1
        const photoName = file.name || `Captura ${pageNumber}.jpg`
        const newPhoto: CapturedPhoto = {
          id: `native-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: photoName,
          size: file.size,
          buffer,
          originalBuffer: buffer.slice(0),
          originalSize: file.size,
          type: 'image/jpeg',
          previewUrl,
          width: w,
          height: h,
          validationStatus: 'valid',
          isEdited: false,
        }

        setCapturedPhotos((prev) => [...prev, newPhoto])
      } catch (err) {
        console.error('[CameraScanner] Erro no fallback nativo:', err)
      }
    }

    if (nativeFallbackInputRef.current) {
      nativeFallbackInputRef.current.value = ''
    }
  }

  // Concluir sessão e enviar fotos para o conversor
  const handleComplete = () => {
    stopStream()
    onComplete(capturedPhotos)
    setCapturedPhotos([])
    onClose()
  }

  // Solicitar cancelamento
  const handleCancelClick = () => {
    if (capturedPhotos.length > 0) {
      setShowCancelConfirm(true)
    } else {
      handleDiscardAndClose()
    }
  }

  // Descartar tudo e fechar
  const handleDiscardAndClose = () => {
    capturedPhotos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
    })
    setCapturedPhotos([])
    setShowCancelConfirm(false)
    stopStream()
    onClose()
  }

  // Salvar o que já foi capturado e fechar
  const handleKeepAndClose = () => {
    setShowCancelConfirm(false)
    handleComplete()
  }

  if (!isOpen) return null

  const latestPhoto = capturedPhotos.length > 0 ? capturedPhotos[capturedPhotos.length - 1] : null
  const totalCount = initialCount + capturedPhotos.length

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none touch-manipulation">
      {/* Hidden input para fallback nativo */}
      <input
        ref={nativeFallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeFallbackFiles}
      />

      {/* 1. BARRA SUPERIOR COMPACTA (Transparente sobre o vídeo para economizar espaço em mobile) */}
      <div className="relative z-20 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-black/75 backdrop-blur-md text-white border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancelClick}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
            title="Fechar câmera"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#C9922A]" />
              Digitalizar com Câmera
            </span>
            {streamResolution && (
              <span className="text-[10px] text-white/60 tabular-nums">
                {streamResolution.width}×{streamResolution.height} px
              </span>
            )}
          </div>
        </div>

        {/* Contador e Botão Concluir no topo */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-white/15 border border-white/10 text-xs font-semibold text-white tabular-nums">
            {capturedPhotos.length} {capturedPhotos.length === 1 ? 'foto' : 'fotos'}
            {initialCount > 0 && (
              <span className="text-white/60 text-[10px] ml-1">({totalCount} total)</span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleComplete}
            disabled={capturedPhotos.length === 0}
            className="h-8 px-3 bg-[#C9922A] hover:bg-[#b58324] disabled:bg-white/20 disabled:text-white/40 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Concluir
          </Button>
        </div>
      </div>

      {/* 2. ÁREA CENTRAL DE VISUALIZAÇÃO AO VIVO */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Flash visual da captura */}
        {lastCaptureFlash && (
          <div className="absolute inset-0 bg-white/80 z-30 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
        )}

        {/* Loading inicial da câmera */}
        {isLoadingCamera && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white gap-3 p-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#C9922A]" />
            <p className="text-sm font-medium">Iniciando a câmera do dispositivo...</p>
            <p className="text-xs text-white/60 max-w-xs">
              Conceda a permissão de acesso caso seja solicitada pelo navegador.
            </p>
          </div>
        )}

        {/* Erro de Câmera e Fallback */}
        {cameraError && !isLoadingCamera && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 text-white p-6 max-w-md mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {cameraError.type === 'permission'
                  ? 'Permissão da câmera necessária'
                  : cameraError.type === 'inuse'
                    ? 'Câmera ocupada'
                    : 'Não foi possível acessar a câmera'}
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">{cameraError.message}</p>
            </div>

            {/* Alternativas */}
            <div className="w-full pt-2 flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => nativeFallbackInputRef.current?.click()}
                className="w-full bg-[#C9922A] hover:bg-[#b58324] text-white text-xs font-semibold h-9"
              >
                <Camera className="w-4 h-4 mr-2" />
                Fotografar via app de câmera do sistema
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => startCamera(selectedDeviceId || undefined, facingMode)}
                className="w-full border-white/20 text-white hover:bg-white/10 text-xs h-9"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelClick}
                className="w-full text-white/60 hover:text-white text-xs h-9"
              >
                Voltar à tela de imagens
              </Button>
            </div>

            {cameraError.type === 'permission' && (
              <div className="text-[11px] text-white/50 text-left bg-white/5 p-3 rounded border border-white/10 w-full space-y-1">
                <span className="font-semibold text-white/80 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-[#C9922A]" />
                  Como autorizar:
                </span>
                <p>
                  No Chrome/Safari/Edge, toque no ícone de opções ou cadeado ao lado do endereço e
                  defina a permissão de Câmera como &quot;Permitir&quot;. Em seguida, recarregue ou
                  tente novamente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vídeo ao vivo */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-contain ${facingMode === 'user' ? '-scale-x-100' : ''}`}
        />

        {/* Guia de enquadramento suave para documentos */}
        {!cameraError && !isLoadingCamera && (
          <div className="absolute inset-8 sm:inset-12 pointer-events-none border border-white/25 rounded-lg flex items-center justify-center">
            <span className="text-[10px] sm:text-xs text-white/40 tracking-wider uppercase font-mono bg-black/40 px-2 py-0.5 rounded">
              Enquadre o documento
            </span>
          </div>
        )}
      </div>

      {/* 3. BARRA DE CONTROLE INFERIOR (Otimizada para toques com uma mão no celular) */}
      <div className="relative z-20 px-4 py-4 sm:py-5 bg-black/85 backdrop-blur-md border-t border-white/10 shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {/* Miniatura da última foto + Refazer */}
          <div className="flex items-center gap-2 min-w-[72px]">
            {latestPhoto ? (
              <div className="relative group">
                <img
                  src={latestPhoto.previewUrl}
                  alt="Última foto capturada"
                  className="w-12 h-12 object-cover rounded-md border-2 border-[#C9922A] shadow-md bg-black"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRedoLast}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow"
                  title="Refazer última fotografia"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <span className="block text-[9px] text-center text-white/70 mt-1 font-mono">
                  {capturedPhotos.length}
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md border border-dashed border-white/20 flex items-center justify-center text-white/30 text-[10px] text-center p-1">
                Sem fotos
              </div>
            )}
          </div>

          {/* Botão Principal de Disparo (Grande e centralizado) */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || isLoadingCamera || Boolean(cameraError)}
              className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-4 focus:ring-[#C9922A]/50 bg-transparent group"
              aria-label="Fotografar página"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white group-hover:bg-[#FAF8F2] group-active:bg-[#C9922A] transition-colors flex items-center justify-center shadow-lg">
                {isCapturing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#252B34]" />
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-black/20" />
                )}
              </div>
            </button>
            <span className="text-[11px] font-semibold text-white/80 mt-1.5 tracking-tight">
              {isCapturing ? 'Capturando...' : 'Fotografar'}
            </span>
          </div>

          {/* Alternar Câmera / Fallback adicional */}
          <div className="flex items-center justify-end min-w-[72px]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleCamera}
              disabled={isLoadingCamera || Boolean(cameraError)}
              className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Alternar câmera"
            >
              <SwitchCamera className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmação ao cancelar com capturas pendentes */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja manter as fotografias capturadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você capturou {capturedPhotos.length}{' '}
              {capturedPhotos.length === 1 ? 'fotografia' : 'fotografias'} nesta sessão. Deseja
              incluí-las na sua lista de páginas ou descartá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={handleDiscardAndClose}
              className="text-red-600 hover:text-red-700"
            >
              Descartar capturas
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKeepAndClose}
              className="bg-[#C9922A] hover:bg-[#b58324] text-white"
            >
              Manter e concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

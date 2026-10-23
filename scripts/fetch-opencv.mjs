import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const OPENCV_URLS = [
  'https://docs.opencv.org/4.x/opencv.js',
  'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js',
  'https://unpkg.com/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js',
]
const TARGET_DIR = path.join(rootDir, 'public', 'opencv')
const TARGET_FILE = path.join(TARGET_DIR, 'opencv.js')
const MIN_SIZE_BYTES = 5 * 1024 * 1024 // Pelo menos 5 MB para OpenCV.js

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: '*/*',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString()
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP status ${res.statusCode} ao baixar ${url}`))
        }
        const fileStream = fs.createWriteStream(dest)
        res.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close(resolve)
        })
        fileStream.on('error', (err) => {
          fs.unlink(dest, () => {})
          reject(err)
        })
      },
    )
    req.on('error', (err) => {
      reject(err)
    })
  })
}

async function ensureOpenCv() {
  if (fs.existsSync(TARGET_FILE)) {
    const stat = fs.statSync(TARGET_FILE)
    if (stat.size >= MIN_SIZE_BYTES) {
      console.log(
        `[fetch-opencv] /opencv/opencv.js já existe e é válido (${(stat.size / (1024 * 1024)).toFixed(2)} MB).`,
      )
      return
    }
    console.warn(
      `[fetch-opencv] Arquivo existente menor que o esperado (${stat.size} bytes). Baixando novamente...`,
    )
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true })
  }

  const tempFile = `${TARGET_FILE}.tmp`
  let downloadSuccess = false
  let lastErr = null

  for (const url of OPENCV_URLS) {
    console.log(`[fetch-opencv] Tentando baixar OpenCV.js de ${url}...`)
    try {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile)
        } catch {}
      }
      await downloadFile(url, tempFile)
      const stat = fs.statSync(tempFile)
      if (stat.size < MIN_SIZE_BYTES) {
        throw new Error(
          `Arquivo baixado muito pequeno (${stat.size} bytes), possível página de erro.`,
        )
      }

      // Validação de conteúdo: deve conter código JS, não HTML
      const sample = fs.readFileSync(tempFile, { encoding: 'utf8', flag: 'r' }).slice(0, 500)
      if (
        sample.toLowerCase().includes('<!doctype html') ||
        sample.toLowerCase().includes('<html')
      ) {
        throw new Error('O conteúdo baixado parece ser HTML e não JavaScript válido.')
      }

      fs.renameSync(tempFile, TARGET_FILE)
      console.log(
        `[fetch-opencv] OpenCV.js baixado com sucesso em ${TARGET_FILE} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) a partir de ${url}.`,
      )
      downloadSuccess = true
      break
    } catch (err) {
      console.warn(`[fetch-opencv] Falha ao baixar de ${url}: ${err.message}`)
      lastErr = err
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile)
        } catch {}
      }
    }
  }

  if (!downloadSuccess) {
    if (fs.existsSync(TARGET_FILE)) {
      const stat = fs.statSync(TARGET_FILE)
      if (stat.size >= MIN_SIZE_BYTES) {
        console.warn(
          `[fetch-opencv] Falha ao atualizar, mas arquivo já existente é válido (${stat.size} bytes).`,
        )
        return
      }
    }
    throw lastErr || new Error('Falha ao obter OpenCV.js de todas as fontes disponíveis.')
  }
}

ensureOpenCv()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

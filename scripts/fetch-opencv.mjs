import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js'
const TARGET_DIR = path.join(rootDir, 'public', 'opencv')
const TARGET_FILE = path.join(TARGET_DIR, 'opencv.js')
const MIN_SIZE_BYTES = 5 * 1024 * 1024 // Pelo menos 5 MB para OpenCV.js 4.10.0

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
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
      })
      .on('error', (err) => {
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
  console.log(`[fetch-opencv] Baixando OpenCV.js 4.10.0 de ${OPENCV_URL}...`)

  try {
    await downloadFile(OPENCV_URL, tempFile)
    const stat = fs.statSync(tempFile)
    if (stat.size < MIN_SIZE_BYTES) {
      fs.unlinkSync(tempFile)
      throw new Error(
        `Arquivo baixado muito pequeno (${stat.size} bytes), possível página de erro.`,
      )
    }

    // Validação de conteúdo: deve conter código JS, não HTML
    const sample = fs.readFileSync(tempFile, { encoding: 'utf8', flag: 'r' }).slice(0, 500)
    if (sample.toLowerCase().includes('<!doctype html') || sample.toLowerCase().includes('<html')) {
      fs.unlinkSync(tempFile)
      throw new Error('O conteúdo baixado parece ser HTML e não JavaScript válido.')
    }

    fs.renameSync(tempFile, TARGET_FILE)
    console.log(
      `[fetch-opencv] OpenCV.js 4.10.0 baixado com sucesso em ${TARGET_FILE} (${(stat.size / (1024 * 1024)).toFixed(2)} MB).`,
    )
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile)
      } catch {}
    }
    console.error(`[fetch-opencv] Erro ao obter opencv.js:`, err.message)
    // Se o arquivo destino não existir, propagar o erro para não buildar em falso
    if (!fs.existsSync(TARGET_FILE)) {
      throw err
    }
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

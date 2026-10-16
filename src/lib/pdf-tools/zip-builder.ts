/**
 * Utilitário de empacotamento ZIP compatível com padrão PKZip (Store - sem compressão pesada).
 *
 * Características:
 * - 100% nativo no navegador (Uint8Array / ArrayBuffer).
 * - Sem dependências externas adicionais.
 * - Modo Store (Compression Method 0) — o padrão da especificação para empacotamento de PDFs sem recompactação.
 * - Suporta CRC-32 padrão IEEE 802.3 com tabela pré-calculada.
 * - Emite formato padrão compatível com Windows Explorer, macOS Archive Utility, Linux unzip e 7-Zip.
 */

// Tabela estática para cálculo ultra-rápido de CRC-32
let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  crcTable = table
  return table
}

export function computeCrc32(bytes: Uint8Array): number {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntryInput {
  name: string
  data: Uint8Array | ArrayBuffer
}

interface ProcessedZipEntry {
  nameBytes: Uint8Array
  dataBytes: Uint8Array
  crc: number
  uncompressedSize: number
  localHeaderOffset: number
}

/**
 * Converte data JS para formato DOS (date e time de 16 bits cada).
 */
function toDosDateTime(d: Date): { dosDate: number; dosTime: number } {
  const year = d.getFullYear()
  const dosYear = Math.max(0, year - 1980)
  const dosDate =
    ((dosYear & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f)
  const dosTime =
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    (Math.floor(d.getSeconds() / 2) & 0x1f)
  return { dosDate: dosDate & 0xffff, dosTime: dosTime & 0xffff }
}

/**
 * Cria um arquivo ZIP no padrão PKZip contendo os arquivos fornecidos em modo Store (Method 0).
 * Retorna um ArrayBuffer pronto para download ou Blob.
 */
export function createZipArchive(entries: ZipEntryInput[]): ArrayBuffer {
  const now = new Date()
  const { dosDate, dosTime } = toDosDateTime(now)
  const encoder = new TextEncoder()

  // 1. Preparar metadados e calcular tamanho total necessário
  const processed: ProcessedZipEntry[] = []
  let currentOffset = 0

  for (const entry of entries) {
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data)
    const nameBytes = encoder.encode(entry.name)
    const crc = computeCrc32(dataBytes)
    const uncompressedSize = dataBytes.byteLength

    processed.push({
      nameBytes,
      dataBytes,
      crc,
      uncompressedSize,
      localHeaderOffset: currentOffset,
    })

    // Local Header (30 bytes) + Name Length + Data Length
    currentOffset += 30 + nameBytes.byteLength + dataBytes.byteLength
  }

  const centralDirectoryOffset = currentOffset
  let centralDirectorySize = 0

  for (const item of processed) {
    // Central Directory Header: 46 bytes + Name Length
    centralDirectorySize += 46 + item.nameBytes.byteLength
  }

  // End of Central Directory Record: 22 bytes
  const totalZipSize = centralDirectoryOffset + centralDirectorySize + 22
  const zipBuffer = new ArrayBuffer(totalZipSize)
  const view = new DataView(zipBuffer)
  const bytes = new Uint8Array(zipBuffer)

  let writePtr = 0

  // 2. Escrever Local File Headers e Conteúdo dos Arquivos
  for (const item of processed) {
    // Local File Header Signature: 0x04034b50 (PK\x03\x04)
    view.setUint32(writePtr, 0x04034b50, true)
    writePtr += 4

    // Version needed to extract: 2.0 (20)
    view.setUint16(writePtr, 20, true)
    writePtr += 2

    // General purpose bit flag: UTF-8 filename (bit 11: 0x0800)
    view.setUint16(writePtr, 0x0800, true)
    writePtr += 2

    // Compression method: 0 (Store)
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // Last mod file time
    view.setUint16(writePtr, dosTime, true)
    writePtr += 2

    // Last mod file date
    view.setUint16(writePtr, dosDate, true)
    writePtr += 2

    // CRC-32
    view.setUint32(writePtr, item.crc, true)
    writePtr += 4

    // Compressed size (igual ao uncompressed no modo Store)
    view.setUint32(writePtr, item.uncompressedSize, true)
    writePtr += 4

    // Uncompressed size
    view.setUint32(writePtr, item.uncompressedSize, true)
    writePtr += 4

    // File name length
    view.setUint16(writePtr, item.nameBytes.byteLength, true)
    writePtr += 2

    // Extra field length
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // File name
    bytes.set(item.nameBytes, writePtr)
    writePtr += item.nameBytes.byteLength

    // File data
    bytes.set(item.dataBytes, writePtr)
    writePtr += item.dataBytes.byteLength
  }

  // 3. Escrever Central Directory
  for (const item of processed) {
    // Central Directory File Header Signature: 0x02014b50 (PK\x01\x02)
    view.setUint32(writePtr, 0x02014b50, true)
    writePtr += 4

    // Version made by: 20 (PKZip 2.0 / MS-DOS/FAT)
    view.setUint16(writePtr, 20, true)
    writePtr += 2

    // Version needed to extract: 20
    view.setUint16(writePtr, 20, true)
    writePtr += 2

    // General purpose bit flag (UTF-8)
    view.setUint16(writePtr, 0x0800, true)
    writePtr += 2

    // Compression method: 0 (Store)
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // Last mod file time
    view.setUint16(writePtr, dosTime, true)
    writePtr += 2

    // Last mod file date
    view.setUint16(writePtr, dosDate, true)
    writePtr += 2

    // CRC-32
    view.setUint32(writePtr, item.crc, true)
    writePtr += 4

    // Compressed size
    view.setUint32(writePtr, item.uncompressedSize, true)
    writePtr += 4

    // Uncompressed size
    view.setUint32(writePtr, item.uncompressedSize, true)
    writePtr += 4

    // File name length
    view.setUint16(writePtr, item.nameBytes.byteLength, true)
    writePtr += 2

    // Extra field length
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // File comment length
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // Disk number start
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // Internal file attributes
    view.setUint16(writePtr, 0, true)
    writePtr += 2

    // External file attributes (0x81a40000 = rw-r--r--)
    view.setUint32(writePtr, 0x81a40000, true)
    writePtr += 4

    // Relative offset of local header
    view.setUint32(writePtr, item.localHeaderOffset, true)
    writePtr += 4

    // File name
    bytes.set(item.nameBytes, writePtr)
    writePtr += item.nameBytes.byteLength
  }

  // 4. Escrever End of Central Directory Record (EOCD)
  // End of central dir signature: 0x06054b50 (PK\x05\x06)
  view.setUint32(writePtr, 0x06054b50, true)
  writePtr += 4

  // Number of this disk
  view.setUint16(writePtr, 0, true)
  writePtr += 2

  // Disk where central directory starts
  view.setUint16(writePtr, 0, true)
  writePtr += 2

  // Number of central directory records on this disk
  view.setUint16(writePtr, processed.length, true)
  writePtr += 2

  // Total number of central directory records
  view.setUint16(writePtr, processed.length, true)
  writePtr += 2

  // Size of central directory
  view.setUint32(writePtr, centralDirectorySize, true)
  writePtr += 4

  // Offset of start of central directory
  view.setUint32(writePtr, centralDirectoryOffset, true)
  writePtr += 4

  // ZIP file comment length
  view.setUint16(writePtr, 0, true)
  writePtr += 2

  return zipBuffer
}

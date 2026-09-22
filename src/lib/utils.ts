/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add any other utility functions here

export function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeText(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Normaliza o texto removendo acentos, caracteres especiais, pontuação,
 * espaços em branco e convertendo para minúsculas, para buscas ultra flexíveis.
 */
export function normalizeSearchText(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

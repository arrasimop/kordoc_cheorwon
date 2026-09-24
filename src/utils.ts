/** kordoc 공용 유틸리티 — 정부 공문서 생성 엔진 경량화 */

declare const __KORDOC_VERSION__: string
export const VERSION: string = typeof __KORDOC_VERSION__ !== "undefined" ? __KORDOC_VERSION__ : "4.14.4"

/**
 * Node.js Buffer → ArrayBuffer 변환
 */
export function toArrayBuffer(buf: Buffer): ArrayBuffer {
  if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
    return buf.buffer as ArrayBuffer
  }
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

/**
 * kordoc 내부 에러 클래스
 */
export class KordocError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "KordocError"
  }
}

/**
 * 에러 메시지 정제
 */
export function sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err) || "문서 처리 중 오류가 발생했습니다"
}

/**
 * URL sanitize — javascript:, data:, vbscript: 차단
 */
export function sanitizeHref(href: string): string | null {
  if (!href) return null
  const trimmed = href.trim()
  const lower = trimmed.toLowerCase().replace(/[\x00-\x20]/g, "")
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return null
  }
  return trimmed
}

/**
 * XML 파싱 전 DTD 선언 제거
 */
export function stripDtd(xml: string): string {
  return xml.replace(/<!DOCTYPE\b[^>]*>/gi, "")
}

/**
 * ZIP 엔트리 경로의 경로 순회 여부 판별
 */
export function isPathTraversal(name: string): boolean {
  if (name.includes("\x00")) return true
  const normalized = name.replace(/\\/g, "/")
  const segments = normalized.split("/")
  return segments.some(s => s === "..") || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)
}

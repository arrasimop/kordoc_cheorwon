/**
 * HWPX 표 생성을 위한 HTML 표 파싱 헬퍼
 */

export const MAX_COLS = 200
export const MAX_ROWS = 10000

export function clampSpan(val: number, max: number): number {
  return Math.max(1, Math.min(val, max))
}

export interface HtmlCellInfo {
  inner: string
  colSpan: number
  rowSpan: number
}

export interface HtmlRowInfo {
  tag: "tr" | "th" | "td"
  cells: HtmlCellInfo[]
}

/**
 * HTML 표 유닛 파싱 — 중첩 <table> 인지 토크나이저.
 * 최상위 표의 <tr>/<td|th>만 행/셀로 취급하고 중첩 표는 셀 inner에 원문 보존.
 */
export function parseHtmlTable(raw: string): HtmlRowInfo[] | null {
  const re = /<(\/?)(table|tr|td|th)((?:"[^"]*"|'[^']*'|[^>"'])*?)>/gi
  let depth = 0
  let currentRow: HtmlCellInfo[] | null = null
  let cellStart = -1
  let cellInfo: { colSpan: number; rowSpan: number } | null = null
  const rows: HtmlRowInfo[] = []
  let m: RegExpExecArray | null

  while ((m = re.exec(raw)) !== null) {
    const isClose = m[1] === "/"
    const tag = m[2].toLowerCase()
    const attrs = m[3] || ""

    if (tag === "table") {
      depth += isClose ? -1 : 1
      if (depth < 0) return null
      continue
    }
    if (depth !== 1) continue // 중첩 표 내부는 inner 원문으로 흡수

    if (tag === "tr") {
      if (!isClose) currentRow = []
      else if (currentRow) {
        rows.push({ tag: rows.length === 0 ? "th" : "td", cells: currentRow })
        currentRow = null
      }
    } else { // td | th
      if (!isClose) {
        const cs = parseInt(attrs.match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || "1", 10)
        const rs = parseInt(attrs.match(/rowspan\s*=\s*["']?(\d+)/i)?.[1] || "1", 10)
        cellStart = m.index + m[0].length
        cellInfo = { colSpan: clampSpan(isNaN(cs) ? 1 : cs, MAX_COLS), rowSpan: clampSpan(isNaN(rs) ? 1 : rs, MAX_ROWS) }
      } else if (cellStart >= 0 && cellInfo && currentRow) {
        currentRow.push({ inner: raw.slice(cellStart, m.index), colSpan: cellInfo.colSpan, rowSpan: cellInfo.rowSpan })
        cellStart = -1
        cellInfo = null
      }
    }
  }
  if (depth !== 0) return null
  return rows
}

/** HTML 셀 inner → 평문 라인 — <br> 분리, <img>/중첩표 토큰 제외 */
export function htmlCellInnerToLines(inner: string): { lines: string[]; hadNonText: boolean; imgSrcs: string[] } {
  let hadNonText = false
  let work = inner
  const imgSrcs: string[] = []
  if (/<table[\s>]/i.test(work)) {
    hadNonText = true
    work = removeNestedTables(work)
  }
  if (/<img\s/i.test(work)) {
    hadNonText = true
    work = work.replace(/<img\s(?:"[^"]*"|'[^']*'|[^>"'])*?>/gi, (tag) => {
      const m = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag)
      const src = m?.[1] ?? m?.[2]
      if (src) imgSrcs.push(src)
      return ""
    })
  }
  const lines = work.split(/<br\s*\/?>/gi).map(s => s.trim()).filter(s => s.length > 0)
  return { lines, hadNonText, imgSrcs }
}

/**
 * 셀 inner를 최상위 표 경계로 분할
 */
export function splitCellByTopLevelTables(html: string): { texts: string[]; tables: string[] } {
  const tables = extractTopLevelTables(html)
  const texts: string[] = []
  let rest = html
  for (const t of tables) {
    const i = rest.indexOf(t)
    texts.push(rest.slice(0, i))
    rest = rest.slice(i + t.length)
  }
  texts.push(rest)
  return { texts, tables }
}

export function extractTopLevelTables(html: string): string[] {
  const result: string[] = []
  let depth = 0
  let start = -1
  const re = /<(\/?)table(?:[\s>]|>)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== "/") {
      if (depth === 0) start = m.index
      depth++
    } else {
      depth--
      if (depth === 0 && start >= 0) {
        result.push(html.slice(start, m.index + m[0].length))
        start = -1
      }
      if (depth < 0) depth = 0
    }
  }
  return result
}

function removeNestedTables(html: string): string {
  let result = ""
  let depth = 0
  const re = /<(\/?)table(?:[\s>]|>)/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== "/") {
      if (depth === 0) result += html.slice(last, m.index)
      depth++
    } else {
      depth--
      if (depth === 0) last = m.index + m[0].length
      if (depth < 0) depth = 0
    }
  }
  if (depth === 0) result += html.slice(last)
  return result
}

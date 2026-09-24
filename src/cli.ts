/**
 * kordoc CLI — 정부 표준 공문서 생성 엔진 전용
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { basename, dirname, resolve } from "path"
import { Command } from "commander"
import {
  markdownToHwpx,
  hwpxToProfile,
  parseFormatProfileJson,
  validateHwpx,
  PRESET_ALIAS,
  unknownFontWarnings,
  incompatibleGongmunWarnings,
  lintGongmunText,
  gongmunLintWarnings,
  lintMuncheText,
  muncheLintWarnings,
  usesGaejosikMunche,
  VERSION,
  type FormatProfile,
  type GongmunOptions,
  type PageOptions,
} from "./index.js"
import {
  buildGongmunOptions,
  BODY_FONTS,
  H2_MARKERS,
  BULLET2_CHARS,
  parseLevelsSpec,
  levelFontRecord,
} from "./hwpx/gongmun-surface.js"
import { sanitizeError } from "./utils.js"

const program = new Command()

program
  .name("kordoc")
  .description("정부 표준 공문서 생성 엔진 — 마크다운(Markdown)을 정부 표준 규격의 HWPX 공문서로 생성")
  .version(VERSION)

// ─── generate 명령 ────────────────────────────────────
program
  .command("generate <markdown>", { isDefault: true })
  .alias("gen")
  .description("마크다운 → 공문서 HWPX 생성 — kordoc generate 보고서.md -o 보고서.hwpx --preset 보고서 (markdown에 '-' 지정 시 stdin)")
  .option("-o, --output <path>", "출력 HWPX 경로 (기본: <입력>.hwpx)")
  .option("--preset <name>", "공문서 프리셋: 기안문(official)·보고서(report)·계획서(plan)·통지(notice)·회의록(minutes)·개조식(gaejosik — 표지·목차·장헤더 자동)·업무보고(ministry — 중앙부처 업무보고)·보도자료(press)", "기안문")
  .option("--font <type>", "본문 글꼴: myeongjo(함초롬바탕) 또는 gothic(맑은 고딕)")
  .option("--pt <size>", "본문 글자 크기(pt)")
  .option("--line-spacing <percent>", "본문 줄간격(%)")
  .option("--profile <path>", "서식 프로필 JSON (kordoc profile로 추출) — 참조 문서의 표 테두리·음영·열폭·셀 글꼴 재현")
  .option("--org <name>", "표지 기관명 (표지를 켜는 프리셋 공통)")
  .option("--date <date>", "표지 날짜 (기본 오늘 — 'YYYY. M. D.')")
  .option("--toc", "목차 페이지 강제 켜기")
  .option("--no-toc", "목차 페이지 끄기")
  .option("--cover", "표지 페이지 강제 켜기")
  .option("--no-cover", "표지 페이지 끄기")
  .option("--approval <labels>", "결재란 직위 라벨 (쉼표 구분, 예: 담당,팀장,과장)")
  .option("--page-numbers", "쪽번호 강제 켜기 (하단 중앙 '- 1 -')")
  .option("--no-page-numbers", "쪽번호 끄기")
  .option("--end-mark", "본문 끝 '끝.' 표시 강제 켜기")
  .option("--no-end-mark", "'끝.' 표시 끄기")
  .option("--no-body-title-box", "본문 첫 페이지 제목 반복 박스 끄기")
  .option("--h2-marker <type>", "h2 장 제목 표기: band·roman·number·box·none")
  .option("--band-color <hex>", "띠 제목 번호칸 채움색 #RRGGBB (기본 #003366)")
  .option("--band-text-color <hex>", "띠 제목 번호 글자색 #RRGGBB (기본 #FFFFFF)")
  .option("--summary <text>", "보고서 요약 박스")
  .option("--doc-info <spec>", "보고서 표지 문서정보표 (예: docNum=스마트도시과-123,date=2026. 9. 6.,disclosure=공개)")
  .option("--dept <name>", "표지 부서명")
  .option("--cover-label <text>", "표지 우상단 취급 표시 (예: 대외주의, 비공개)")
  .option("--fonts <spec>", "요소별 글꼴 오버라이드: body=나눔명조,heading=나눔고딕,ref=한양중고딕,table=맑은 고딕")
  .option("--sizes <spec>", "개조식 요소별 크기(pt): dae=16,cham=13,table=12,coverTitle=30 …")
  .option("--levels <spec>", "항목부호 단계별 위계 타이포 (예: 0=HY견고딕/17/bold,1=한컴돋움/15/bold,2=휴먼명조/14)")
  .option("--bullet2 <char>", "2단계 항목부호: ㅇ(이응) 또는 ○(원)")
  .option("--suppress-single", "단일 형제 항목 부호 생략")
  .option("--doc-head <spec>", "기안문 두문표 (예: org=기관명,slogan=원훈,to=수신처,title=제목)")
  .option("--doc-foot <spec>", "기안문 결문표 (예: sender=발신명의,drafter=주무관 홍길동)")
  .option("--report-info <text>", "보고서 담당자 행 / 기안문 우상단 보고정보 행")
  .option("--notice-head <spec>", "공고문 두문·결문 (예: no=공고 제2026-1호,date=2026년 7월 11일,sender=행정안전부장관)")
  .option("--press-head <spec>", "보도자료 머리 (예: release=보도시점,distribute=배포일,dept=담당부서,manager=담당자,phone=연락처)")
  .option("--press-sub <items>", "보도자료 부제 (세미콜론 구분)")
  .option("--plain", "공문서 모드 끄기 (범용 마크다운 변환)")
  .option("--paper <size>", "용지: A4·A3·B4·B5·Letter 또는 '210x297'(mm)")
  .option("--landscape", "용지 가로 방향")
  .option("--columns <n>", "다단 개수 (1~8)")
  .option("--header <text>", "머리말 텍스트")
  .option("--footer <text>", "꼬리말 텍스트")
  .option("--image-dir <dir>", "마크다운 이미지 참조(![](x.png))를 이 디렉토리에서 읽어 실데이터 임베드")
  .option("--silent", "진행 메시지 숨기기")
  .action(async (markdown: string, opts) => {
    try {
      const output: string | undefined = opts.output
      const silent: boolean = !!opts.silent

      let md: string
      let baseName = "document"
      if (markdown === "-") {
        md = readFileSync(0, "utf-8")
      } else {
        const inPath = resolve(markdown)
        md = readFileSync(inPath, "utf-8")
        baseName = basename(inPath).replace(/\.(md|markdown|txt)$/i, "")
      }

      let gongmun: GongmunOptions | undefined
      if (!opts.plain) {
        const preset = PRESET_ALIAS[String(opts.preset).trim()]
        if (!preset) {
          process.stderr.write(`[kordoc] 알 수 없는 프리셋: ${opts.preset} (기안문/보고서/계획서/통지/회의록/개조식/업무보고/보도자료)\n`)
          process.exit(1)
        }
        const enumCheck = <T extends readonly string[]>(flag: string, value: unknown, allowed: T): (typeof allowed)[number] | undefined => {
          if (value === undefined) return undefined
          if (!allowed.includes(String(value))) {
            process.stderr.write(`[kordoc] ${flag} 는 ${allowed.join("/")}\n`)
            process.exit(1)
          }
          return value as (typeof allowed)[number]
        }

        const parseKv = (spec: string, flag: string): Record<string, string> => {
          const out: Record<string, string> = {}
          for (const piece of spec.split(",")) {
            const p = piece.trim()
            if (!p) continue
            const eq = p.indexOf("=")
            const key = eq > 0 ? p.slice(0, eq).trim() : ""
            const value = eq > 0 ? p.slice(eq + 1).trim() : ""
            if (!key || !value) {
              process.stderr.write(`[kordoc] ${flag}: 'key=value' 형식이 아닌 조각 무시 — "${p}"\n`)
              continue
            }
            out[key] = value
          }
          return out
        }
        const pressKv = opts.pressHead ? parseKv(String(opts.pressHead), "--press-head") : {}
        gongmun = buildGongmunOptions({
          preset,
          font: enumCheck("--font", opts.font, BODY_FONTS),
          bodyPt: opts.pt ? Number(opts.pt) : undefined,
          lineSpacing: opts.lineSpacing ? Number(opts.lineSpacing) : undefined,
          org: opts.org, date: opts.date,
          cover: opts.cover, toc: opts.toc,
          approval: opts.approval ? String(opts.approval).split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
          pageNumbers: opts.pageNumbers, endMark: opts.endMark,
          bodyTitleBox: opts.bodyTitleBox === false ? false : undefined,
          h2Marker: enumCheck("--h2-marker", opts.h2Marker, H2_MARKERS),
          bandColor: opts.bandColor, bandTextColor: opts.bandTextColor,
          fonts: opts.fonts ? parseKv(String(opts.fonts), "--fonts") : undefined,
          sizes: opts.sizes
            ? Object.fromEntries(
              Object.entries(parseKv(String(opts.sizes), "--sizes")).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number.isFinite(v as number)),
            )
            : undefined,
          levels: opts.levels ? parseLevelsSpec(String(opts.levels)) : undefined,
          bullet2: enumCheck("--bullet2", opts.bullet2, BULLET2_CHARS),
          suppressSingle: opts.suppressSingle ? true : undefined,
          docHead: opts.docHead ? parseKv(String(opts.docHead), "--doc-head") : undefined,
          docFoot: opts.docFoot ? parseKv(String(opts.docFoot), "--doc-foot") : undefined,
          reportInfo: opts.reportInfo ? String(opts.reportInfo) : undefined,
          summary: opts.summary ? String(opts.summary) : undefined,
          docInfo: opts.docInfo ? parseKv(String(opts.docInfo), "--doc-info") : undefined,
          dept: opts.dept ? String(opts.dept) : undefined,
          coverLabel: opts.coverLabel ? String(opts.coverLabel) : undefined,
          noticeHead: opts.noticeHead ? parseKv(String(opts.noticeHead), "--notice-head") : undefined,
          press: opts.pressHead || opts.pressSub
            ? {
              release: pressKv.release, distribute: pressKv.distribute,
              sub: opts.pressSub ? String(opts.pressSub).split(";").map((s: string) => s.trim()).filter(Boolean) : undefined,
              contact: pressKv.dept || pressKv.manager || pressKv.phone ? { dept: pressKv.dept, manager: pressKv.manager, phone: pressKv.phone } : undefined,
            }
            : undefined,
        })
      }

      if (gongmun?.fonts && !silent) {
        for (const w of unknownFontWarnings(gongmun.fonts)) process.stderr.write(`[kordoc] ${w}\n`)
      }
      if (gongmun?.levels && !silent) {
        for (const w of unknownFontWarnings(levelFontRecord(gongmun.levels))) process.stderr.write(`[kordoc] ${w}\n`)
      }
      if (gongmun && !silent) {
        for (const w of incompatibleGongmunWarnings(gongmun)) process.stderr.write(`[kordoc] ⚠ ${w}\n`)
        for (const w of gongmunLintWarnings(md, 5)) process.stderr.write(`[kordoc] ⚠ ${w}\n`)
        if (usesGaejosikMunche(gongmun.preset)) {
          for (const w of muncheLintWarnings(md, 5)) process.stderr.write(`[kordoc] ⚠ ${w}\n`)
        }
      }

      let profile: FormatProfile | undefined
      if (opts.profile) {
        profile = parseFormatProfileJson(readFileSync(resolve(String(opts.profile)), "utf-8"))
        if (!silent) process.stderr.write(`[kordoc] 서식 프로필 적용: 표 ${profile.tables.length}개 (${opts.profile})\n`)
      }

      let page: PageOptions | undefined
      if (opts.paper || opts.landscape || opts.columns || opts.header || opts.footer) {
        let size: PageOptions["size"]
        if (opts.paper) {
          const wh = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i.exec(String(opts.paper).trim())
          size = wh ? { widthMm: Number(wh[1]), heightMm: Number(wh[2]) } : (String(opts.paper) as "A4")
        }
        page = {
          ...(size !== undefined ? { size } : {}),
          ...(opts.landscape ? { orientation: "landscape" as const } : {}),
          ...(opts.columns ? { columns: Number(opts.columns) } : {}),
          ...(opts.header ? { header: String(opts.header) } : {}),
          ...(opts.footer ? { footer: String(opts.footer) } : {}),
        }
      }

      let imageBytes: Record<string, Uint8Array> | undefined
      if (opts.imageDir) {
        const dir = resolve(String(opts.imageDir))
        for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
          const url = m[1]
          if (!/^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/.test(url) || url.includes("..")) continue
          try {
            const bytes = readFileSync(resolve(dir, url))
            ;(imageBytes ??= {})[url] = new Uint8Array(bytes)
          } catch { /* skip missing */ }
        }
        if (!silent) process.stderr.write(`[kordoc] 이미지 임베드: ${Object.keys(imageBytes ?? {}).length}개 (${dir})\n`)
      }

      const genWarnings: string[] = []
      const buf = await markdownToHwpx(md, gongmun || profile || page || imageBytes
        ? {
          ...(gongmun ? { gongmun } : {}), ...(profile ? { profile } : {}),
          ...(page ? { page } : {}), ...(imageBytes ? { images: imageBytes } : {}),
          warnings: genWarnings,
        }
        : undefined)
      if (!silent) for (const w of genWarnings) process.stderr.write(`[kordoc] ⚠ ${w}\n`)

      const outPath = resolve(output ?? (markdown === "-" ? `${baseName}.hwpx` : markdown.replace(/\.(md|markdown|txt)$/i, "") + ".hwpx"))
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, Buffer.from(buf))

      if (!silent) {
        const mode = gongmun ? `공문서:${gongmun.preset}` : "범용"
        process.stderr.write(`[kordoc] HWPX 생성 완료 (${mode}) → ${outPath}\n`)
      }
    } catch (err) {
      process.stderr.write(`[kordoc] 오류: ${sanitizeError(err)}\n`)
      process.exit(1)
    }
  })

// ─── profile 명령 ─────────────────────────────────────
program
  .command("profile <file>")
  .description("HWPX 표 서식 프로필 추출 — 참조 문서의 표 테두리·음영·열폭·셀 글꼴을 JSON으로 추출")
  .option("-o, --output <path>", "출력 JSON 경로 (기본: <입력>.profile.json)")
  .option("--silent", "진행 메시지 숨기기")
  .action(async (file: string, opts) => {
    try {
      const absPath = resolve(file)
      const profile = await hwpxToProfile(readFileSync(absPath))
      const outPath = resolve(opts.output ?? absPath.replace(/\.hwpx$/i, "") + ".profile.json")
      mkdirSync(dirname(outPath), { recursive: true })
      writeFileSync(outPath, JSON.stringify(profile, null, 2), "utf-8")
      if (!opts.silent) {
        process.stderr.write(`[kordoc] 표 서식 프로필 추출 완료 (${profile.tables.length}개 표) → ${outPath}\n`)
      }
    } catch (err) {
      process.stderr.write(`[kordoc] 오류: ${sanitizeError(err)}\n`)
      process.exit(1)
    }
  })

// ─── lint 명령 ────────────────────────────────────────
program
  .command("lint <file>")
  .description("공문서 표기법 및 문체 검수 — 행정업무운영 편람 표기법 점검")
  .option("--munche", "개조식 문체 검수 활성화 (서술형 종결, 과도한 길이 등)")
  .option("--format <fmt>", "출력 형식: text 또는 json", "text")
  .action((file: string, opts) => {
    try {
      const text = file === "-" ? readFileSync(0, "utf-8") : readFileSync(resolve(file), "utf-8")
      const pFindings = lintGongmunText(text, { document: true })
      const mFindings = opts.munche ? lintMuncheText(text) : []
      const allFindings = [
        ...pFindings.map(f => ({ ...f, type: "표기법" as const })),
        ...mFindings.map(f => ({ ...f, type: "문체" as const })),
      ]

      if (opts.format === "json") {
        process.stdout.write(JSON.stringify({ findings: allFindings, total: allFindings.length }, null, 2) + "\n")
      } else {
        if (allFindings.length === 0) {
          process.stderr.write(`[kordoc] 표기법 검수 통과 (오류 없음)\n`)
        } else {
          for (const f of allFindings) {
            const loc = `L${f.line}`
            process.stderr.write(`[kordoc] [${f.type}] ${loc} (${f.rule}) ${f.message}\n`)
          }
          process.stderr.write(`[kordoc] 총 ${allFindings.length}건 발견\n`)
        }
      }
      if (allFindings.length > 0) process.exitCode = 1
    } catch (err) {
      process.stderr.write(`[kordoc] 오류: ${sanitizeError(err)}\n`)
      process.exit(1)
    }
  })

// ─── validate 명령 ────────────────────────────────────
program
  .command("validate <file>")
  .description("HWPX 컨테이너 무결성 검증 (한컴오피스 규격 검증)")
  .action(async (file: string) => {
    try {
      const absPath = resolve(file)
      const res = await validateHwpx(readFileSync(absPath))
      if (res.ok) {
        process.stderr.write(`[kordoc] HWPX 무결성 검증 통과 (엔트리 ${res.entryCount}개)\n`)
      } else {
        process.stderr.write(`[kordoc] HWPX 무결성 검증 실패:\n`)
        for (const issue of res.issues) {
          process.stderr.write(`  - ${issue.path ? `[${issue.path}] ` : ""}${issue.message}\n`)
        }
        process.exitCode = 1
      }
    } catch (err) {
      process.stderr.write(`[kordoc] 오류: ${sanitizeError(err)}\n`)
      process.exit(1)
    }
  })

program.parse(process.argv)

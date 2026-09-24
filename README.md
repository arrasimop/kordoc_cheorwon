# kordoc — 정부 표준 공문서 생성 엔진

마크다운(Markdown)을 대한민국 정부 표준 규격의 `HWPX` 공문서로 생성하는 경량화 엔진입니다.

기존의 파서(HWP/PDF/XLSX/DOCX), OCR, 렌더러, MCP 등의 부가 기능을 모두 제거하고, **공문서 생성(`generator`) 및 검수(`lint`) 기능만을 집약하여 초경량·고속 빌드가 가능하도록 최적화**되었습니다.

---

## 주요 특징

- **정부 표준 조판 규격 준수**:
  - 행정업무운영 편람 기준 두문/결문(별지 제1호서식), 결재선, 제목 표, 요약 박스, "끝." 마커 자동 배치
  - 항목 부호 8단계(□, ㅇ, -, ㆍ, 1., 가., 1), 가)) 및 내어쓰기 자동 탭 정렬
  - 한컴 실폰트 폭표 기반 어절 줄바꿈 및 외톨이줄 방지
- **실결재 서식 프리셋**:
  - `기안문`(official), `보고서`(report), `계획서`(plan), `통지`(notice), `회의록`(minutes), `개조식`(gaejosik), `업무보고`(ministry), `보도자료`(press)
- **공문서 표기법 및 문체 검수**:
  - 날짜, 시간, 금액(한글 병기), 물결표, 두음법칙 등 19개 표기법 룰 검수
  - 서술형 종결, 과도한 문장 길이 등 개조식 문체 12개 룰 검수
- **초경량 번들**:
  - 외부 무거운 의존성(ONNX, PDFium, Sharp 등) 완전 제거
  - 순수 Node.js 환경에서 수백 KB 단일 번들로 동작 (빌드 시간 0.2초 이내)

---

## 빌드 및 사용법

### 1. 빌드

```powershell
npm run build
```

### 2. CLI 사용법

#### 공문서 생성 (기본)

```powershell
# 보고서 프리셋으로 생성
node ./dist/cli.js 보고서.md -o 보고서.hwpx --preset 보고서

# 기안문 프리셋 (두문/결문 지정)
node ./dist/cli.js 기안문.md -o 기안문.hwpx --preset 기안문 --doc-head "org=철원군,title=추진계획안"

# 중앙부처 업무보고 프리셋 (표지/장 띠/요약박스)
node ./dist/cli.js 업무보고.md -o 업무보고.hwpx --preset 업무보고 --cover --date "2026. 9. 24."
```

#### 공문서 표기법 및 문체 검수

```powershell
node ./dist/cli.js lint 보고서.md --munche
```

#### 생성된 HWPX 무결성 검증

```powershell
node ./dist/cli.js validate 보고서.hwpx
```

---

## Node.js 라이브러리 API

```typescript
import { markdownToHwpx, validateHwpx } from "kordoc"
import { readFileSync, writeFileSync } from "fs"

const md = readFileSync("보고서.md", "utf-8")

// HWPX 버퍼 생성
const hwpxBuffer = await markdownToHwpx(md, {
  gongmun: {
    preset: "report", // official, report, plan, ministry, gaejosik 등
  },
})

writeFileSync("보고서.hwpx", Buffer.from(hwpxBuffer))

// 무결성 검증
const check = await validateHwpx(hwpxBuffer)
console.log("검증 결과:", check.ok)
```

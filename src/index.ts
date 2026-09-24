/**
 * kordoc — 정부 표준 공문서 생성 엔진
 *
 * Markdown → 정부 표준 공문서 HWPX 생성 전용 경량화 엔진
 */

export { markdownToHwpx } from "./hwpx/generator.js"
export type { HwpxTheme, MarkdownToHwpxOptions } from "./hwpx/generator.js"
export type { PageOptions } from "./hwpx/gen-page.js"
export type {
  FormatProfile, TableProfile, CellProfile, BorderFillDef, BorderDef, CharPrDef,
} from "./hwpx/generator.js"
export { hwpxToProfile } from "./hwpx/extract-profile.js"
export { parseFormatProfileJson } from "./hwpx/profile-io.js"
export { normalizeGongmunPreset, PRESET_ALIAS, incompatibleGongmunWarnings } from "./hwpx/gongmun.js"
export { isKnownFont, unknownFontWarnings } from "./hwpx/font-catalog.js"
export { lintGongmunText, gongmunLintWarnings } from "./hwpx/gongmun-lint.js"
export type { GongmunLintFinding } from "./hwpx/gongmun-lint.js"
export { lintMuncheText, muncheLintWarnings, usesGaejosikMunche } from "./hwpx/munche-lint.js"
export type { MuncheLintFinding, MuncheLineKind } from "./hwpx/munche-lint.js"
export {
  charWidthEm1000, measureTextWidth, simulateWrap, simulateWrapKeepWord, fitRatioForFewerLines,
  SPACE_EM_FIXED, SPACE_EM_FONT,
} from "./hwpx/text-metrics.js"
export type { MeasureOptions, WrapResult, WrapMode } from "./hwpx/text-metrics.js"
export type {
  GongmunOptions,
  GongmunPreset,
  GongmunPresetInput,
  GongmunNumbering,
  GongmunFont,
} from "./hwpx/gongmun.js"

export { validateHwpx } from "./validate.js"
export type { ValidateResult, ValidateIssue } from "./validate.js"

export { VERSION, KordocError } from "./utils.js"

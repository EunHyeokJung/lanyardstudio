import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? collectFiles(path) : [path];
      }),
    )
  ).flat();
}

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LanyardStudio size-first landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("cross-origin-opener-policy"),
    "same-origin",
  );
  assert.match(
    response.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );

  const html = await response.text();
  assert.match(html, /<title>LanyardStudio \| 명찰 인쇄 스튜디오<\/title>/i);
  assert.match(html, /어떤 명찰을/);
  assert.match(html, /바로 시작하기/);
  assert.match(html, /디자인, 명단 연결, 인쇄물 생성까지 한번에/);
  assert.match(html, /명단을 한 번에 연결/);
  assert.match(html, /인쇄까지 정확하게/);
  assert.match(html, /드래그 앤 드롭과 중앙 자석 정렬/);
  assert.match(html, /UTF-8 CSV 업로드와 최대 500명 처리/);
  assert.match(html, /반접이 테이블 명패도 양면으로 자동 배치/);
  assert.match(html, /feature-demo-editor/);
  assert.match(html, /feature-demo-data/);
  assert.match(html, /feature-demo-print/);
  assert.match(html, /대표 명찰 규격/);
  assert.match(html, /목걸이 명찰 · 대형 95 × 123 mm 선택/);
  assert.match(html, /A7 행사 명찰/);
  assert.match(html, /A4 반접이 테이블 명패/);
  assert.match(html, /앞뒤 양쪽에서 같은 이름/);
  assert.match(html, /A4 1장당 1명/);
  assert.match(html, /B7 컨퍼런스 패스/);
  assert.match(html, /CR80 · ID-1/);
  assert.match(html, /시중 상품 예시/);
  assert.match(html, /하나제이 미디어명찰 세로/);
  assert.match(html, /하나제이 고급 미디어명찰 세로/);
  assert.match(html, /고무나라 700 미디어 목걸이명찰 세로/);
  assert.match(html, /Bigpoint 보호형 카드 포켓 A7 세로/);
  assert.match(html, /알파 클리어케이스 B7 세로형/);
  assert.match(html, /아트사인 신분증W케이스 가로/);
  assert.match(html, /두성종이 OA팬시페이퍼 180g/);
  assert.match(html, /네임모아 스마트명찰 가로/);
  assert.match(html, /구매 전 95 × 123 mm 내지 규격을 확인/);
  assert.match(html, /규격 직접 입력/);
  assert.match(html, /이 규격으로 만들기/);
  assert.doesNotMatch(html, /이 규격으로 시작/);
  assert.doesNotMatch(html, /POPULAR SIZES/);
  assert.doesNotMatch(html, /크기부터 인쇄까지 한 번에/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps production editing, project storage, and PDF rendering connected", async () => {
  const [studio, storage, css, logo] = await Promise.all([
    readFile(
      new URL("../components/BadgeStudio.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/lanyardstudio/storage.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../public/brand/lanyardstudio-mark.svg", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(studio, /type ImageElement = CommonElement/);
  assert.match(studio, /const BADGE_PRESETS: BadgePreset\[\]/);
  assert.match(studio, /id: "a4-table-tent"/);
  assert.match(studio, /outputMode: "table-tent"/);
  assert.match(studio, /function createTableTentElements/);
  assert.match(studio, /async function rotateBadgeImage180/);
  assert.match(studio, /doc\.setLineDashPattern\(\[2, 2\], 0\)/);
  assert.match(studio, /function LandingPage/);
  assert.match(studio, /setSelectedPresetId\(preset\.id\)/);
  assert.match(studio, /aria-pressed={isSelected}/);
  assert.match(studio, /disabled={!selectedPreset}/);
  assert.doesNotMatch(studio, /onClick=\{\(\) => onSelectPreset\(preset\)\}/);
  assert.match(studio, /className="feature-story"/);
  assert.match(studio, /className="feature-story is-reversed"/);
  assert.match(studio, /aria-label={t\("featureDesignVisualLabel"\)}/);
  assert.match(studio, /aria-label={t\("featureDataVisualLabel"\)}/);
  assert.match(studio, /aria-label={t\("featurePrintVisualLabel"\)}/);
  assert.match(studio, /aria-controls="landing-start-menu"/);
  assert.match(studio, /disabled={!savedProjects\.length}/);
  assert.match(studio, /className="saved-project-dialog"/);
  assert.match(studio, /savedProjects\.map\(\(project\) =>/);
  assert.match(studio, /onOpenProject={openSavedProject}/);
  assert.match(studio, /onDeleteProject={removeSavedProject}/);
  assert.match(studio, /onRenameProject={renameSavedProject}/);
  assert.match(studio, /className="saved-project-rename-form"/);
  assert.match(studio, /className="editor-project-name"/);
  assert.match(studio, /normalizeProjectName/);
  assert.match(studio, /role="dialog"/);
  assert.match(studio, /aria-modal="true"/);
  assert.match(studio, /document\.addEventListener\("keydown", closeOnEscape\)/);
  assert.match(studio, /function startWithPreset/);
  assert.match(studio, /async function readImageAsset/);
  assert.match(studio, /script, foreignObject, iframe, object, embed/);
  assert.match(studio, /function handleCanvasDrop/);
  assert.match(studio, /import QRCode from "qrcode"/);
  assert.match(studio, /type ShapeElement =/);
  assert.match(studio, /function addShapeElement/);
  assert.match(studio, /async function addQrElement/);
  assert.match(studio, /async function regenerateQrElement/);
  assert.match(studio, /addStaticElement\("heading"\)/);
  assert.match(studio, /addStaticElement\("body"\)/);
  assert.match(studio, /addStaticElement\("caption"\)/);
  assert.match(studio, /className="element-palette-grid shape-palette-grid"/);
  assert.match(studio, /className="secondary-button full-width qr-launch-button"/);
  assert.match(studio, /className="qr-dialog-overlay"/);
  assert.match(studio, /role="dialog"/);
  assert.match(studio, /aria-labelledby="qr-dialog-title"/);
  assert.match(studio, /function moveElementLayer/);
  assert.match(studio, /function exportProject/);
  assert.match(studio, /function importProject/);
  assert.match(studio, /const PROJECT_FORMAT = "lanyardstudio"/);
  assert.match(studio, /const PROJECT_VERSION = 11/);
  assert.match(studio, /const shouldMigratePersonName =/);
  assert.match(studio, /field: "사람 이름"/);
  assert.match(studio, /type FontFamilyKey =/);
  assert.match(studio, /const FONT_FAMILIES:/);
  assert.match(studio, /function getFontFamily/);
  assert.match(studio, /fontFamily: getFontFamily\(element\.fontFamily\)/);
  assert.match(studio, /const fontFamily = getFontFamily\(element\.fontFamily\)/);
  assert.match(studio, /t\("fontFamily"\)/);
  assert.match(studio, /row=\{undefined\}/);
  assert.doesNotMatch(studio, /t\("previewData"\)/);
  assert.match(studio, /format: PROJECT_FORMAT/);
  assert.match(studio, /\.lanyardstudio\.json/);
  assert.match(studio, /function normalizeProject/);
  assert.match(studio, /type BrandBarElement/);
  assert.match(studio, /type: "brandBar"/);
  assert.match(studio, /function getBrandBarSlots/);
  assert.match(studio, /function drawBrandLogoCropped/);
  assert.match(
    studio,
    /multiple[\s\S]{0,120}accept="image\/png,image\/jpeg,image\/webp,image\/svg\+xml,.svg"/,
  );
  assert.match(studio, /className="brand-crop-dialog"/);
  assert.match(studio, /applyBrandCropSession/);
  assert.match(studio, /SAMPLE_DATA_BY_LOCALE/);
  assert.match(studio, /"Alex Morgan"/);
  assert.match(studio, /const \[previewPageIndex, setPreviewPageIndex\]/);
  assert.match(studio, /previewRows\.map\(\(row, index\) =>/);
  assert.match(studio, /className="preview-pagination"/);
  assert.match(studio, /className="secondary-button mobile-print-settings-trigger"/);
  assert.match(studio, /id="print-settings-panel"/);
  assert.match(studio, /className="mobile-print-sheet-header"/);
  assert.match(studio, /className="print-settings-scroll"/);
  assert.match(studio, /mode !== "print"/);
  const topbarExportMarkup = studio.slice(
    studio.indexOf('{mode !== "print"'),
    studio.indexOf("</header>"),
  );
  assert.doesNotMatch(topbarExportMarkup, /onClick=\{exportPdf\}/);
  assert.match(studio, /function PreviewCropMarks/);
  assert.match(studio, /<PreviewCropMarks/);
  assert.match(studio, /className="secondary-button full-width orientation-swap-button"/);
  assert.doesNotMatch(studio, /<h2>\{t\("outputSettings"\)\}<\/h2>/);
  assert.match(studio, /MAX_ROWS = 500/);
  assert.match(studio, /const undoElements = useCallback/);
  assert.match(studio, /const undoData = useCallback/);
  assert.match(studio, /mode === "data"/);
  assert.match(studio, /className="data-add-actions"/);
  assert.match(studio, /className="secondary-button mobile-column-action"/);
  assert.match(studio, /className="add-column-cell"/);
  assert.match(studio, /className="row-select"/);
  assert.match(studio, /className="row-reorder"/);
  assert.match(studio, /className="row-drag-handle"/);
  assert.match(studio, /className="delete-selected-rows"/);
  assert.match(studio, /handleDataRowPointerDown/);
  assert.match(studio, /handleDataRowPointerMove/);
  assert.match(studio, /removeSelectedDataRows/);
  assert.match(studio, /moveDataRowBy/);
  assert.doesNotMatch(studio, /className="row-actions"/);
  assert.doesNotMatch(studio, /t\("manage"\)/);
  assert.match(studio, /const DEFAULT_FIELDS = \["사람 이름", "팀", "직책"\]/);
  assert.match(studio, /name: "이름 텍스트"/);
  assert.match(studio, /newColumnVariable/);
  assert.doesNotMatch(studio, /\{t\("addRow"\)\}/);
  assert.match(studio, /type ResizeState =/);
  assert.match(studio, /function handleResizePointerDown/);
  assert.match(studio, /onResizePointerDown={handleResizePointerDown}/);
  assert.match(studio, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(studio, /deleteSelectedFromShortcut/);
  assert.match(studio, /groupId\?: string/);
  assert.match(studio, /function getElementMoveBounds/);
  assert.match(studio, /function selectCanvasElement/);
  assert.match(studio, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey/);
  assert.match(studio, /function groupElements/);
  assert.match(studio, /function ungroupElements/);
  assert.match(studio, /className="canvas-context-menu"/);
  assert.match(studio, /multi-selection-inspector/);
  assert.doesNotMatch(studio, /t\("addAsLayer"\)/);
  assert.doesNotMatch(studio, /t\("imageLogoHelp"\)/);
  assert.match(studio, /className="panel-section variable-connections"/);
  const variableConnectionsMarkup = studio.slice(
    studio.indexOf('className="panel-section variable-connections"'),
    studio.indexOf('className="compact-variable-add"'),
  );
  assert.doesNotMatch(variableConnectionsMarkup, /\{\{\$\{field\}\}\}/);
  assert.match(
    studio,
    /\{!selectedElement && selectedElements\.length === 0 && \(\s*<>\s*<section className="panel-section layer-panel"/s,
  );
  assert.match(studio, /function renameField/);
  assert.match(studio, /addVariableElement\(field\)/);
  assert.match(studio, /className="compact-variable-add"/);
  assert.match(studio, /connectedElementCount/);
  assert.match(studio, /noLinkedElements/);
  assert.match(studio, /name: string/);
  assert.match(studio, /className="panel-section element-header"/);
  assert.match(studio, /className="element-name-label"/);
  assert.match(studio, /aria-label=\{t\("elementName"\)\}/);
  assert.match(studio, /name: `\$\{getElementLabel\(selectedElement, t\)\}/);
  assert.match(studio, /className="variable-element-links"/);
  assert.doesNotMatch(studio, /className="panel-section selected-summary"/);
  assert.doesNotMatch(studio, /className="reference-note"/);
  assert.doesNotMatch(studio, /A4 · 95 × 123 mm · 4-UP/);
  assert.doesNotMatch(studio, /t\("browserOnly"\)/);
  assert.doesNotMatch(studio, /t\("badgeDesign"\)/);
  assert.doesNotMatch(studio, /t\("lanyardBadge"\)/);
  assert.match(studio, /type InspectorSheetState =/);
  assert.match(studio, /handleInspectorSheetPointerDown/);
  assert.match(studio, /className={`panel right-panel inspector-sheet/);
  assert.match(studio, /className={`inspector-sheet-scrim/);
  assert.match(studio, /inspectorSheetState === "expanded"/);
  assert.match(
    studio,
    /inspectorSheetState === "collapsed" \? "half" : "collapsed"/,
  );
  assert.match(studio, /className="inspector-sheet-handle"/);
  assert.match(studio, /type ResponsiveToolPanel =/);
  assert.match(studio, /className="responsive-editor-toolbar"/);
  assert.match(studio, /className="mode-label"/);
  assert.match(studio, /openResponsiveToolPanel\("badge"\)/);
  assert.match(studio, /openResponsiveToolPanel\("background"\)/);
  assert.match(studio, /openResponsiveToolPanel\("elements"\)/);
  assert.match(studio, /openResponsiveLayerPanel/);
  assert.match(studio, /className="responsive-tool-panel-body"/);
  assert.match(studio, /className="inspector-sheet-body"/);
  assert.match(studio, /backgroundColor,\s+background,\s+backgroundFit,/);
  assert.match(studio, /for \(const element of elements\)/);
  assert.doesNotMatch(
    studio,
    /SETUP|INSPECTOR|DATA SOURCE|SCHEMA|PRINT PREVIEW|REFERENCE READY/,
  );
  assert.doesNotMatch(studio, /className="eyebrow"/);
  assert.doesNotMatch(
    studio,
    /<h2>\{t\("elementProperties"\)\}<\/h2>/,
  );
  assert.doesNotMatch(studio, /Settings2/);
  assert.match(css, /\.badge-image-element/);
  assert.match(css, /\.badge-shape-element/);
  assert.match(css, /\.element-palette-grid/);
  assert.match(css, /\.qr-launch-button/);
  assert.match(css, /\.qr-dialog-overlay/);
  assert.match(css, /\.qr-dialog\s*\{/);
  assert.match(css, /\.badge-brand-bar/);
  assert.match(css, /\.brand-crop-dialog/);
  assert.match(css, /\.brand-logo-row/);
  assert.match(css, /\.preview-crop-marks/);
  assert.match(css, /\.preview-pagination button/);
  assert.match(css, /\.orientation-swap-button\s*{[^}]*margin-top: 12px/s);
  assert.doesNotMatch(css, /\.reference-note/);
  assert.match(css, /\.preset-grid/);
  assert.match(css, /\.preset-card\.is-selected/);
  assert.match(css, /\.preset-products/);
  assert.match(css, /\.preset-product-item/);
  assert.match(css, /\.preset-card\.is-selected\s*{[^}]*background: #eff6ff/s);
  assert.doesNotMatch(
    css,
    /\.preset-card\.is-featured\s*{[^}]*background: #1e3a8a/s,
  );
  assert.match(css, /\.preset-actions/);
  assert.match(css, /\.create-selected-preset-button/);
  assert.match(css, /\.service-overview/);
  assert.match(css, /\.feature-story/);
  assert.match(css, /\.feature-editor-layout/);
  assert.match(css, /\.feature-data-layout/);
  assert.match(css, /\.feature-print-layout/);
  assert.match(css, /\.landing-start-menu/);
  assert.match(css, /\.saved-project-overlay/);
  assert.match(css, /\.saved-project-list/);
  assert.match(css, /\.saved-project-delete/);
  assert.match(css, /\.saved-project-rename-form/);
  assert.match(
    css,
    /@media \(min-width: 681px\) and \(max-width: 980px\)/,
  );
  assert.match(css, /\.right-panel\.inspector-sheet\s*{[^}]*position: fixed/s);
  assert.match(css, /touch-action: none/);
  assert.match(css, /\.inspector-sheet-grip\s*{[^}]*place-items: center/s);
  assert.match(css, /\.inspector-sheet-handle\s*{[^}]*width: 40px/s);
  assert.match(
    css,
    /\.responsive-editor-toolbar\s*{[^}]*grid-template-columns: repeat\(4,/s,
  );
  assert.match(
    css,
    /\.mode-nav\s*{[^}]*grid-template-columns: repeat\(3,/s,
  );
  assert.match(
    css,
    /\.mode-nav button\s*{[^}]*border: 1px solid transparent[^}]*padding: 0 var\(--control-padding-x\)/s,
  );
  const modeActiveCss = css.slice(
    css.indexOf(".mode-nav button.is-active"),
    css.indexOf(".step-number"),
  );
  assert.doesNotMatch(
    modeActiveCss,
    /(?:padding|width|height|min-width|min-height|transform|box-shadow)\s*:/,
  );
  assert.match(css, /\.topbar\s*{[^}]*z-index: 90/s);
  assert.match(css, /\.mode-nav\s*{[^}]*z-index: 80/s);
  assert.match(css, /\.responsive-editor-toolbar\s*{[^}]*z-index: 75/s);
  assert.match(css, /html\s*{[^}]*scrollbar-gutter: stable/s);
  assert.doesNotMatch(
    css,
    /\.primary-button:hover:not\(:disabled\)\s*{[^}]*transform:/s,
  );
  assert.doesNotMatch(
    css,
    /\.asset-upload-button:hover\s*{[^}]*transform:/s,
  );
  assert.doesNotMatch(css, /\.preset-card:hover\s*{[^}]*transform:/s);
  assert.match(
    css,
    /\.left-panel\.responsive-tool-panel\s*{[^}]*position: fixed/s,
  );
  assert.match(
    css,
    /@media \(max-width: 680px\)[\s\S]*\.right-panel\.inspector-sheet\s*{[^}]*position: fixed/s,
  );
  assert.match(
    css,
    /\.inspector-sheet-body::-webkit-scrollbar[^{]*{[^}]*display: none/s,
  );
  assert.match(
    css,
    /\.responsive-tool-panel-body::-webkit-scrollbar[^{]*{[^}]*display: none/s,
  );
  assert.match(
    css,
    /@media \(max-width: 680px\)[\s\S]*\.print-settings\.is-open\s*{[^}]*transform: translate3d\(0, 0, 0\)/s,
  );
  assert.match(
    css,
    /\.print-settings-scroll::-webkit-scrollbar[^{]*{[^}]*display: none/s,
  );
  assert.match(css, /\.editor-project-name/);
  assert.match(css, /\.landing-shell:lang\(ko\)\s*{[^}]*word-break: keep-all/s);
  assert.match(css, /\.service-overview-heading\s*{[^}]*max-width: 900px/s);
  assert.match(css, /\.service-overview-heading h2[^{]*{[^}]*text-wrap: balance/s);
  assert.match(css, /\.service-overview-heading p[^{]*{[^}]*text-wrap: pretty/s);
  assert.match(css, /\.preset-mini-sheet/);
  assert.match(css, /\.fold-guide/);
  assert.match(css, /\.table-tent-panel\.is-reversed/);
  assert.doesNotMatch(css, /\.eyebrow|\.landing-kicker|\.reference-kicker/);
  assert.match(css, /\.layer-list/);
  assert.match(css, /\.alignment-guide/);
  assert.match(css, /\.selection-handle\s*{[^}]*width: 16px/s);
  assert.match(css, /\.badge-surface\.is-interactive\s*{[^}]*overflow: visible/s);
  assert.match(css, /\.multi-selection-outline/);
  assert.match(css, /\.canvas-context-menu/);
  assert.match(css, /\.variable-connection-list/);
  assert.match(css, /\.element-header-actions/);
  assert.match(css, /\.variable-element-links/);
  assert.match(css, /\.data-add-actions/);
  assert.match(css, /\.row-drag-handle\s*{[^}]*touch-action: none/s);
  assert.match(css, /\.delete-selected-rows/);
  assert.match(css, /\.data-table \.add-column-cell/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /LOCAL_PROJECTS_KEY/);
  assert.match(storage, /PREVIOUS_DATABASE_TOKEN/);
  assert.match(storage, /ensureIndexedDbMigration/);
  assert.match(storage, /PROJECT_KEY_PREFIX/);
  assert.match(storage, /export async function listProjectDrafts/);
  assert.match(storage, /export async function deleteProjectDraft/);
  assert.match(storage, /makeLegacyProject/);
  assert.match(logo, /A lanyard and badge symbol/);
  assert.match(logo, /linearGradient id="bg"/);
});

test("keeps Cloudflare Pages and optional GA4 deployment configuration portable", async () => {
  const [layout, analytics, nextConfig, packageJson, cloudflareHeaders] =
    await Promise.all([
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../components/GoogleAnalytics.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    ]);

  assert.match(layout, /<body>[\s\S]*<GoogleAnalytics \/>[\s\S]*<\/body>/);
  assert.match(analytics, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(analytics, /service_name/);
  assert.match(analytics, /linker/);
  assert.match(analytics, /lanyard-studio\.com/);
  assert.match(analytics, /lanyardstudio\.silverhyeok\.dev/);
  assert.match(analytics, /return null/);
  assert.doesNotMatch(analytics, /G-[A-Z0-9]{6,}/);
  assert.match(nextConfig, /STATIC_EXPORT/);
  assert.match(nextConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(packageJson, /build:cloudflare-pages/);
  assert.match(packageJson, /lanyard-studio\.com/);
  assert.match(cloudflareHeaders, /Content-Security-Policy/);
  assert.match(cloudflareHeaders, /www\.googletagmanager\.com/);
  assert.match(cloudflareHeaders, /google-analytics\.com/);
});

test("ships an installable multilingual PWA contract", async () => {
  const [manifestResponse, i18n, controls, serviceWorker] = await Promise.all([
    render("/manifest.webmanifest"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/AppControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);

  assert.equal(manifestResponse.status, 200);
  assert.match(
    manifestResponse.headers.get("content-type") ?? "",
    /^application\/manifest\+json\b/i,
  );
  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, "LanyardStudio 명찰 인쇄 스튜디오");
  assert.equal(manifest.short_name, "LanyardStudio");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.deepEqual(
    manifest.icons.map(({ sizes }) => sizes),
    ["192x192", "512x512"],
  );

  for (const locale of ["ko", "en", "ja", "zh-CN", "zh-TW", "es", "fr", "de"]) {
    assert.match(i18n, new RegExp(`code: "${locale.replace("-", "\\-")}"`));
  }
  assert.match(i18n, /DICTIONARIES\[locale\]\[key\] \?\? en\[key\]/);
  assert.match(i18n, /continueDraft: "저장된 프로젝트 이어하기"/);
  assert.match(i18n, /projectName: "프로젝트 이름"/);
  assert.doesNotMatch(i18n, /previewData:/);
  assert.match(i18n, /variableConnections: "변수"/);
  assert.match(i18n, /selectAllRows: "전체 행 선택"/);
  assert.match(i18n, /deleteSelectedRows: "선택 \{count\}개 삭제"/);
  assert.match(i18n, /reorderRow: "\{row\}행 순서 이동"/);
  assert.doesNotMatch(i18n, /저장된 작업|작업 단계|작업 순서/);
  assert.match(controls, /beforeinstallprompt/);
  assert.match(controls, /PackagePlus/);
  assert.doesNotMatch(
    controls,
    /import \{[^}]*Download[^}]*\} from "lucide-react"/,
  );
  assert.match(
    controls,
    /navigator\.serviceWorker\.register\(withBasePath\("\/sw\.js"\)/,
  );
  assert.match(serviceWorker, /lanyardstudio-app-v2/);
  assert.match(serviceWorker, /self\.registration\.scope/);
  assert.match(serviceWorker, /cache\.put\(SCOPE_PATH, copy\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
});

test("keeps the desktop editor inside the dynamic viewport", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /@media \(min-width: 981px\)/);
  assert.match(css, /\.app-shell\s*{[^}]*height: 100dvh/s);
  assert.match(css, /\.main-content\s*{[^}]*overflow: hidden/s);
  assert.match(css, /\.canvas-stage\s*{[^}]*overflow: auto/s);
  assert.match(
    css,
    /@media \(max-width: 980px\)[\s\S]*?\.topbar\s*{[^}]*backdrop-filter: none/,
  );
});

test("defines a GitHub Pages static-export contract", async () => {
  const [nextConfig, packageJson, workflow, sitePaths, readme, readmeEn] =
    await Promise.all([
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(
        new URL("../.github/workflows/pages.yml", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/site.ts", import.meta.url), "utf8"),
      readFile(new URL("../README.md", import.meta.url), "utf8"),
      readFile(new URL("../README.en.md", import.meta.url), "utf8"),
    ]);

  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /basePath/);
  assert.match(nextConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(packageJson, /NEXT_PUBLIC_BASE_PATH=\/lanyardstudio/);
  assert.match(packageJson, /eunhyeokjung\.github\.io\/lanyardstudio/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(sitePaths, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(sitePaths, /lanyard-studio\.com/);
  assert.match(packageJson, /EunHyeokJung\/lanyardstudio/);
  assert.match(readme, /EunHyeokJung\/lanyardstudio/);
  assert.match(readmeEn, /EunHyeokJung\/lanyardstudio/);
});

test("ships a secure multilingual notice for the previous domain", async () => {
  const [html, css, script, headers, redirects] = await Promise.all([
    readFile(new URL("../legacy-site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../legacy-site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../legacy-site/moved.js", import.meta.url), "utf8"),
    readFile(new URL("../legacy-site/_headers", import.meta.url), "utf8"),
    readFile(new URL("../legacy-site/_redirects", import.meta.url), "utf8"),
  ]);

  assert.match(html, /LanyardStudio has moved/);
  assert.match(html, /https:\/\/lanyard-studio\.com\//);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /name="robots" content="noindex, follow"/);
  assert.match(html, /id="language-select"/);
  assert.match(script, /"zh-CN"/);
  assert.match(script, /"zh-TW"/);
  for (const locale of ["ko", "en", "ja", "es", "fr", "de"]) {
    assert.match(script, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(script, /navigator\.languages/);
  assert.match(script, /G-WES0G3FJY5/);
  assert.match(script, /service_name: "lanyardstudio-moved"/);
  assert.match(script, /ANALYTICS_DOMAINS/);
  assert.match(script, /lanyard-studio\.com/);
  assert.match(script, /lanyardstudio\.silverhyeok\.dev/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(headers, /Content-Security-Policy/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(redirects, /\/\* \/index\.html 200/);
});

test("renders a recoverable not-found page", async () => {
  const response = await render("/missing-page");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /요청한 페이지를 찾을 수 없습니다/);
});

test("keeps the retired identity out of deployable output", async () => {
  const retiredIdentity = Buffer.from("YmFkZ2VmbG93", "base64").toString(
    "utf8",
  );
  const distPath = new URL("../dist", import.meta.url).pathname;
  const files = await collectFiles(distPath);
  for (const file of files) {
    const contents = await readFile(file);
    assert.equal(
      contents.toString("utf8").toLowerCase().includes(retiredIdentity),
      false,
      `${file} contains the retired identity`,
    );
  }
});

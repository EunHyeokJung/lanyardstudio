"use client";

import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Columns3,
  Copy,
  CreditCard,
  Crop,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GalleryHorizontal,
  GripVertical,
  Group,
  Image as ImageIcon,
  ImagePlus,
  Layers3,
  LayoutTemplate,
  LoaderCircle,
  Lock,
  Minus,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  Palette,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Redo2,
  Ruler,
  Rows3,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";
import QRCode from "qrcode";
import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppControls } from "@/components/AppControls";
import {
  type Locale,
  type MessageKey,
  type Translate,
  useI18n,
} from "@/lib/i18n";
import {
  deleteProjectDraft,
  listProjectDrafts,
  loadProjectDraft,
  type StoredProjectSummary,
  saveProjectDraft,
} from "@/lib/lanyardstudio/storage";
import { withBasePath } from "@/lib/site";

type Mode = "design" | "data" | "print";
type AppView = "landing" | "studio";
type Align = "left" | "center" | "right";
type ElementKind = "variable" | "static";
type ShapeKind = "rectangle" | "ellipse" | "line";
type BrandBarDirection = "horizontal" | "vertical";
type FontFamilyKey = "sans" | "serif" | "rounded" | "display" | "mono";
type BackgroundFit = "cover" | "contain" | "stretch";
type PagePreset = "A4" | "A3" | "Letter" | "custom";
type OutputMode = "standard" | "table-tent";
type InspectorSheetState = "collapsed" | "half" | "expanded";
type ResponsiveToolPanel = "badge" | "background" | "elements" | null;

type CommonElement = {
  id: string;
  name: string;
  groupId?: string;
  type: "text" | "image" | "shape" | "brandBar";
  x: number;
  y: number;
  width: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
};

type TextElement = CommonElement & {
  type: "text";
  kind: ElementKind;
  field?: string;
  value?: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: FontFamilyKey;
  color: string;
  align: Align;
};

type ImageElement = CommonElement & {
  type: "image";
  src: string;
  mimeType: string;
  height: number;
  fit: BackgroundFit;
  aspectRatio: number;
  sourceKind?: "upload" | "qr";
  qrValue?: string;
};

type ShapeElement = CommonElement & {
  type: "shape";
  shapeKind: ShapeKind;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
};

type BrandLogo = {
  id: string;
  name: string;
  src: string;
  mimeType: string;
  aspectRatio: number;
  cropX: number;
  cropY: number;
  zoom: number;
};

type BrandBarElement = CommonElement & {
  type: "brandBar";
  height: number;
  direction: BrandBarDirection;
  gap: number;
  padding: number;
  backgroundColor: string;
  cornerRadius: number;
  logos: BrandLogo[];
};

type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | BrandBarElement;

type BadgeRow = {
  id: string;
  [key: string]: string;
};

type DataSnapshot = {
  fields: string[];
  rows: BadgeRow[];
  selectedRowId: string;
  elements?: CanvasElement[];
  selectedElementId?: string | null;
};

type DataHistoryEntry = {
  includesElements: boolean;
  snapshot: DataSnapshot;
};

type DataRowPointerDrag = {
  pointerId: number;
  rowId: string;
  startY: number;
  moved: boolean;
  historyRecorded: boolean;
  lastTargetRowId?: string;
};

type PageSettings = {
  preset: PagePreset;
  width: number;
  height: number;
  gapX: number;
  gapY: number;
  showOutline: boolean;
  showCropMarks: boolean;
};

type DragState = {
  anchorId: string;
  ids: string[];
  pointerX: number;
  pointerY: number;
  origins: Record<string, { x: number; y: number }>;
};

type ResizeDirection = "nw" | "ne" | "sw" | "se";

type ResizeState = {
  id: string;
  direction: ResizeDirection;
  pointerX: number;
  pointerY: number;
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight?: number;
  aspectRatio?: number;
};

type SnapGuides = {
  vertical: boolean;
  horizontal: boolean;
};

type CanvasContextMenu = {
  x: number;
  y: number;
  targetIds: string[];
  groupId?: string;
};

type BrandCropSession = {
  targetElementId?: string;
  replaceLogoId?: string;
  logos: BrandLogo[];
  activeIndex: number;
  direction: BrandBarDirection;
  backgroundColor: string;
};

type BrandCropDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  cropX: number;
  cropY: number;
};

type InspectorSheetDrag = {
  pointerId: number;
  startY: number;
  lastY: number;
  moved: boolean;
};

const inspectorSheetStates: InspectorSheetState[] = [
  "collapsed",
  "half",
  "expanded",
];

type BadgePreset = {
  id: string;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  width: number;
  height: number;
  a4Count: number;
  tag: string;
  tagKey?: MessageKey;
  featured?: boolean;
  outputMode?: OutputMode;
  productNoteKey?: MessageKey;
  productExamples?: Array<{
    nameKo: string;
    nameEn: string;
    size: string;
    fit: "exact" | "check" | "paper";
  }>;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type ActiveProject = Pick<
  StoredProjectSummary,
  "id" | "name" | "createdAt"
>;

const PROJECT_FORMAT = "lanyardstudio" as const;
const PROJECT_VERSION = 11;

const FONT_FAMILIES: ReadonlyArray<{
  value: FontFamilyKey;
  labelKey: MessageKey;
  stack: string;
}> = [
  {
    value: "sans",
    labelKey: "fontSans",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "serif",
    labelKey: "fontSerif",
    stack:
      'ui-serif, "Noto Serif CJK KR", "Noto Serif KR", AppleMyungjo, Batang, "Times New Roman", serif',
  },
  {
    value: "rounded",
    labelKey: "fontRounded",
    stack:
      'ui-rounded, "Arial Rounded MT Bold", "Hiragino Maru Gothic ProN", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "display",
    labelKey: "fontDisplay",
    stack:
      'Impact, Haettenschweiler, "Arial Narrow Bold", "Noto Sans KR", "Malgun Gothic", sans-serif',
  },
  {
    value: "mono",
    labelKey: "fontMono",
    stack:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
];

const FONT_FAMILY_KEYS = new Set<FontFamilyKey>(
  FONT_FAMILIES.map(({ value }) => value),
);

function getFontFamily(fontFamily: FontFamilyKey) {
  return (
    FONT_FAMILIES.find(({ value }) => value === fontFamily)?.stack ??
    FONT_FAMILIES[0].stack
  );
}

type BadgeProject = {
  format: typeof PROJECT_FORMAT;
  version: number;
  updatedAt: string;
  badgeWidth: number;
  badgeHeight: number;
  safeArea: number;
  backgroundColor: string;
  background: string | null;
  backgroundName: string;
  backgroundFit: BackgroundFit;
  elements: CanvasElement[];
  fields: string[];
  rows: BadgeRow[];
  page: PageSettings;
  dpi: number;
  outputMode: OutputMode;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PROJECT_BYTES = 30 * 1024 * 1024;
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_LENGTH = 14 * 1024 * 1024;
const MAX_BRAND_BAR_DATA_LENGTH = 24 * 1024 * 1024;
const MAX_ELEMENTS = 200;
const MAX_ROWS = 500;
const MAX_FIELDS = 50;
const MAX_FIELD_LENGTH = 80;
const MAX_CELL_LENGTH = 2_000;
const MAX_PROJECT_NAME_LENGTH = 80;
const MAX_BRAND_LOGOS = 24;
const FORBIDDEN_FIELD_NAMES = new Set([
  "id",
  "__proto__",
  "constructor",
  "prototype",
]);

const RESIZE_DIRECTIONS: ResizeDirection[] = ["nw", "ne", "sw", "se"];

const PAGE_PRESETS: Record<
  Exclude<PagePreset, "custom">,
  { width: number; height: number; label: string }
> = {
  A4: { width: 210, height: 297, label: "A4 · 210 × 297 mm" },
  A3: { width: 297, height: 420, label: "A3 · 297 × 420 mm" },
  Letter: { width: 215.9, height: 279.4, label: "Letter · 216 × 279 mm" },
};

const DEFAULT_FIELDS = ["사람 이름", "팀", "직책"];
// Commercial product specifications were last checked on 2026-08-17.
// Keep the purchase-time size reminder visible when updating these examples.
const BADGE_PRESETS: BadgePreset[] = [
  {
    id: "lanyard-large",
    nameKey: "presetLanyard",
    descriptionKey: "presetLanyardDescription",
    width: 95,
    height: 123,
    a4Count: 4,
    tag: "",
    tagKey: "mostPopular",
    featured: true,
    productExamples: [
      {
        nameKo: "하나제이 미디어명찰 세로",
        nameEn: "HANAJAY Media Badge · Portrait",
        size: "95 × 123 mm",
        fit: "exact",
      },
      {
        nameKo: "하나제이 고급 미디어명찰 세로",
        nameEn: "HANAJAY Premium Media Badge · Portrait",
        size: "95 × 123 mm",
        fit: "exact",
      },
      {
        nameKo: "고무나라 700 미디어 목걸이명찰 세로",
        nameEn: "Komunara 700 Media Lanyard Badge · Portrait",
        size: "103 × 133 mm",
        fit: "check",
      },
    ],
  },
  {
    id: "a7-event",
    nameKey: "presetA7",
    descriptionKey: "presetA7Description",
    width: 74,
    height: 105,
    a4Count: 4,
    tag: "ISO A7",
    productExamples: [
      {
        nameKo: "Bigpoint 보호형 카드 포켓 A7 세로",
        nameEn: "Bigpoint Protected Card Pocket A7 · Portrait",
        size: "74 × 105 mm",
        fit: "exact",
      },
      {
        nameKo: "LION 카드케이스 A7",
        nameEn: "LION Card Case A7",
        size: "74 × 105 mm",
        fit: "exact",
      },
    ],
  },
  {
    id: "b7-pass",
    nameKey: "presetB7",
    descriptionKey: "presetB7Description",
    width: 91,
    height: 128,
    a4Count: 4,
    tag: "",
    tagKey: "largePortrait",
    productExamples: [
      {
        nameKo: "알파 클리어케이스 B7 세로형",
        nameEn: "Alpha Clear Case B7 · Portrait",
        size: "91 × 128 mm",
        fit: "exact",
      },
      {
        nameKo: "TRUSCO 소프트 카드케이스 B7",
        nameEn: "TRUSCO Soft Card Case B7",
        size: "91 × 128 mm",
        fit: "exact",
      },
    ],
  },
  {
    id: "id-card",
    nameKey: "presetId",
    descriptionKey: "presetIdDescription",
    width: 85.6,
    height: 54,
    a4Count: 10,
    tag: "CR80 · ID-1",
    productExamples: [
      {
        nameKo: "아트사인 신분증W케이스 가로",
        nameEn: "ArtSign ID W Case · Landscape",
        size: "86 × 54 mm",
        fit: "check",
      },
      {
        nameKo: "아트사인 M9055 신분증케이스 가로",
        nameEn: "ArtSign M9055 ID Case · Landscape",
        size: "86 × 54 mm",
        fit: "check",
      },
    ],
  },
  {
    id: "a4-table-tent",
    nameKey: "presetTableTent",
    descriptionKey: "presetTableTentDescription",
    width: 297,
    height: 105,
    a4Count: 1,
    tag: "",
    tagKey: "tableTent",
    outputMode: "table-tent",
    productNoteKey: "paperProductDisclaimer",
    productExamples: [
      {
        nameKo: "두성종이 OA팬시페이퍼 180g",
        nameEn: "Doosung OA Fancy Paper 180 gsm",
        size: "A4 · 210 × 297 mm",
        fit: "paper",
      },
      {
        nameKo: "삼원특수지 매직터치 180g",
        nameEn: "Samwon Magic Touch 180 gsm",
        size: "A4 · 210 × 297 mm",
        fit: "paper",
      },
    ],
  },
  {
    id: "name-card",
    nameKey: "presetLandscape",
    descriptionKey: "presetLandscapeDescription",
    width: 90,
    height: 60,
    a4Count: 8,
    tag: "",
    tagKey: "landscape",
    productExamples: [
      {
        nameKo: "네임모아 스마트명찰 가로",
        nameEn: "Namemoa Smart Name Badge · Landscape",
        size: "90 × 60 mm",
        fit: "exact",
      },
      {
        nameKo: "DURABLE 8135 시큐리티 명찰",
        nameEn: "DURABLE 8135 Security Name Badge",
        size: "90 × 60 mm",
        fit: "exact",
      },
    ],
  },
];

const SAMPLE_ROWS: BadgeRow[] = [
  { id: "row-1", "사람 이름": "김민지", 팀: "브랜드팀", 직책: "디자이너" },
  { id: "row-2", "사람 이름": "박준호", 팀: "제품팀", 직책: "프로덕트 매니저" },
  { id: "row-3", "사람 이름": "이서연", 팀: "운영팀", 직책: "매니저" },
  { id: "row-4", "사람 이름": "최현우", 팀: "개발팀", 직책: "엔지니어" },
];

const SAMPLE_DATA_BY_LOCALE: Record<
  Locale,
  { fields: [string, string, string]; rows: Array<[string, string, string]> }
> = {
  ko: {
    fields: ["사람 이름", "팀", "직책"],
    rows: [
      ["김민지", "브랜드팀", "디자이너"],
      ["박준호", "제품팀", "프로덕트 매니저"],
      ["이서연", "운영팀", "매니저"],
      ["최현우", "개발팀", "엔지니어"],
    ],
  },
  en: {
    fields: ["Name", "Team", "Role"],
    rows: [
      ["Alex Morgan", "Brand", "Designer"],
      ["Jordan Lee", "Product", "Product Manager"],
      ["Taylor Kim", "Operations", "Manager"],
      ["Casey Park", "Engineering", "Engineer"],
    ],
  },
  ja: {
    fields: ["氏名", "チーム", "役職"],
    rows: [
      ["佐藤 美咲", "ブランド", "デザイナー"],
      ["鈴木 健太", "プロダクト", "プロダクトマネージャー"],
      ["高橋 葵", "運営", "マネージャー"],
      ["田中 悠斗", "開発", "エンジニア"],
    ],
  },
  "zh-CN": {
    fields: ["姓名", "团队", "职务"],
    rows: [
      ["陈雨欣", "品牌团队", "设计师"],
      ["李明浩", "产品团队", "产品经理"],
      ["王思琪", "运营团队", "经理"],
      ["张子轩", "开发团队", "工程师"],
    ],
  },
  "zh-TW": {
    fields: ["姓名", "團隊", "職稱"],
    rows: [
      ["陳雨欣", "品牌團隊", "設計師"],
      ["李明浩", "產品團隊", "產品經理"],
      ["王思琪", "營運團隊", "經理"],
      ["張子軒", "開發團隊", "工程師"],
    ],
  },
  es: {
    fields: ["Nombre", "Equipo", "Cargo"],
    rows: [
      ["Sofía García", "Marca", "Diseñadora"],
      ["Mateo López", "Producto", "Product Manager"],
      ["Valentina Ruiz", "Operaciones", "Gerente"],
      ["Lucas Martín", "Ingeniería", "Ingeniero"],
    ],
  },
  fr: {
    fields: ["Nom", "Équipe", "Fonction"],
    rows: [
      ["Camille Bernard", "Marque", "Designer"],
      ["Louis Martin", "Produit", "Chef de produit"],
      ["Chloé Robert", "Opérations", "Responsable"],
      ["Hugo Petit", "Ingénierie", "Ingénieur"],
    ],
  },
  de: {
    fields: ["Name", "Team", "Rolle"],
    rows: [
      ["Mia Schneider", "Marke", "Designerin"],
      ["Paul Wagner", "Produkt", "Produktmanager"],
      ["Emma Becker", "Betrieb", "Managerin"],
      ["Leon Fischer", "Entwicklung", "Ingenieur"],
    ],
  },
};

function getLocalizedSampleData(locale: Locale) {
  const sample = SAMPLE_DATA_BY_LOCALE[locale];
  const [nameField, teamField, roleField] = sample.fields;
  return {
    fields: [...sample.fields],
    rows: sample.rows.map(([name, team, role], index) => ({
      id: `row-${index + 1}`,
      [nameField]: name,
      [teamField]: team,
      [roleField]: role,
    })),
  };
}

const DEFAULT_ELEMENTS: CanvasElement[] = [
  {
    id: "element-team",
    name: "팀 텍스트",
    type: "text",
    kind: "variable",
    field: "팀",
    x: 8,
    y: 22,
    width: 79,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "sans",
    color: "#687076",
    align: "center",
    opacity: 1,
    rotation: 0,
    locked: false,
    hidden: false,
  },
  {
    id: "element-name",
    name: "이름 텍스트",
    type: "text",
    kind: "variable",
    field: "사람 이름",
    x: 8,
    y: 57,
    width: 79,
    fontSize: 25,
    fontWeight: 700,
    fontFamily: "sans",
    color: "#17201f",
    align: "center",
    opacity: 1,
    rotation: 0,
    locked: false,
    hidden: false,
  },
  {
    id: "element-title",
    name: "직책 텍스트",
    type: "text",
    kind: "variable",
    field: "직책",
    x: 8,
    y: 79,
    width: 79,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "sans",
    color: "#687076",
    align: "center",
    opacity: 1,
    rotation: 0,
    locked: false,
    hidden: false,
  },
];

const DEFAULT_PAGE: PageSettings = {
  preset: "A4",
  width: 210,
  height: 297,
  gapX: 0,
  gapY: 0,
  showOutline: true,
  showCropMarks: true,
};

const TABLE_TENT_PAGE: PageSettings = {
  preset: "custom",
  width: 297,
  height: 210,
  gapX: 0,
  gapY: 0,
  showOutline: false,
  showCropMarks: false,
};

function createPresetElements(
  width: number,
  height: number,
  fields: string[] = DEFAULT_FIELDS,
  t?: Translate,
): CanvasElement[] {
  const isLandscape = width > height;
  const inset = Math.max(4, Math.round(width * 0.08 * 10) / 10);
  const contentWidth = Math.round((width - inset * 2) * 10) / 10;
  const [nameField, teamField, roleField] = fields;
  const elementSuffix = t?.("textElements") || "텍스트";
  const nameSize = isLandscape
    ? Math.max(14, Math.min(20, Math.round(width * 0.2)))
    : Math.max(20, Math.min(26, Math.round(width * 0.28)));

  return [
    {
      id: "element-team",
      name: `${teamField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: teamField,
      x: inset,
      y: Math.round(height * 0.25 * 10) / 10,
      width: contentWidth,
      fontSize: isLandscape ? 8 : 11,
      fontWeight: 600,
      fontFamily: "sans",
      color: "#64748b",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
    {
      id: "element-name",
      name: `${nameField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: nameField,
      x: inset,
      y: Math.round(height * 0.5 * 10) / 10,
      width: contentWidth,
      fontSize: nameSize,
      fontWeight: 700,
      fontFamily: "sans",
      color: "#17201f",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
    {
      id: "element-title",
      name: `${roleField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: roleField,
      x: inset,
      y: Math.round(height * 0.74 * 10) / 10,
      width: contentWidth,
      fontSize: isLandscape ? 8 : 11,
      fontWeight: 500,
      fontFamily: "sans",
      color: "#64748b",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
  ];
}

function createTableTentElements(
  fields: string[] = DEFAULT_FIELDS,
  t?: Translate,
): CanvasElement[] {
  const [nameField, teamField, roleField] = fields;
  const elementSuffix = t?.("textElements") || "텍스트";
  return [
    {
      id: "element-team",
      name: `${teamField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: teamField,
      x: 20,
      y: 30,
      width: 257,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "sans",
      color: "#64748b",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
    {
      id: "element-name",
      name: `${nameField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: nameField,
      x: 20,
      y: 55,
      width: 257,
      fontSize: 32,
      fontWeight: 800,
      fontFamily: "sans",
      color: "#17201f",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
    {
      id: "element-title",
      name: `${roleField} ${elementSuffix}`,
      type: "text",
      kind: "variable",
      field: roleField,
      x: 20,
      y: 80,
      width: 257,
      fontSize: 13,
      fontWeight: 500,
      fontFamily: "sans",
      color: "#64748b",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    },
  ];
}

function LandingPage({
  savedProjects,
  onOpenProject,
  onDeleteProject,
  onRenameProject,
  onSelectPreset,
  onCustom,
  locale,
  setLocale,
  t,
}: {
  savedProjects: StoredProjectSummary[];
  onOpenProject: (projectId: string) => Promise<boolean>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onRenameProject: (projectId: string, name: string) => Promise<boolean>;
  onSelectPreset: (preset: BadgePreset) => void;
  onCustom: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}) {
  const [heroLineOne, heroLineTwo] = t("heroTitle").split("\n");
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [showSavedProjects, setShowSavedProjects] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null,
  );
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectListError, setProjectListError] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    BADGE_PRESETS[0]?.id ?? null,
  );
  const startControlRef = useRef<HTMLDivElement>(null);
  const startTriggerRef = useRef<HTMLButtonElement>(null);
  const savedDialogRef = useRef<HTMLElement>(null);
  const savedDialogCloseRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const selectedPreset = BADGE_PRESETS.find(
    (preset) => preset.id === selectedPresetId,
  );
  const savedDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const formatSavedProjectDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : savedDateFormatter.format(date);
  };

  useEffect(() => {
    if (!showStartMenu) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !startControlRef.current?.contains(event.target)
      ) {
        setShowStartMenu(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowStartMenu(false);
      startTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showStartMenu]);

  useEffect(() => {
    if (!showSavedProjects) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => savedDialogCloseRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSavedProjects(false);
        window.requestAnimationFrame(() => startTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        savedDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showSavedProjects]);

  useEffect(() => {
    if (!renamingProjectId) return;
    window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renamingProjectId]);

  const openSavedProject = async (projectId: string) => {
    setOpeningProjectId(projectId);
    setProjectListError("");
    const opened = await onOpenProject(projectId);
    if (!opened) {
      setOpeningProjectId(null);
      setProjectListError(t("savedProjectOpenError"));
    }
  };

  const deleteSavedProject = async (project: StoredProjectSummary) => {
    if (!window.confirm(t("deleteSavedProjectConfirm", { name: project.name }))) {
      return;
    }
    setProjectListError("");
    try {
      await onDeleteProject(project.id);
    } catch {
      setProjectListError(t("savedProjectDeleteError"));
    }
  };

  const beginRenameProject = (project: StoredProjectSummary) => {
    setProjectListError("");
    setRenamingProjectId(project.id);
    setRenameDraft(project.name);
  };

  const cancelRenameProject = () => {
    setRenamingProjectId(null);
    setRenameDraft("");
  };

  const submitProjectRename = async (project: StoredProjectSummary) => {
    const name = normalizeProjectName(renameDraft, project.name);
    if (name === project.name) {
      cancelRenameProject();
      return;
    }
    setIsRenamingProject(true);
    setProjectListError("");
    const renamed = await onRenameProject(project.id, name);
    setIsRenamingProject(false);
    if (!renamed) {
      setProjectListError(t("savedProjectRenameError"));
      return;
    }
    cancelRenameProject();
  };

  const startNewBadge = () => {
    setShowStartMenu(false);
    const presets = document.getElementById("landing-presets");
    const presetTitle = document.getElementById("preset-title");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    presets?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.requestAnimationFrame(() => presetTitle?.focus({ preventScroll: true }));
  };

  return (
    <div className="landing-shell">
      <a className="skip-link" href="#landing-presets">
        {t("skipPresets")}
      </a>
      <header className="landing-header">
        <span className="landing-brand">
          <BrandMark />
          <strong>LanyardStudio</strong>
        </span>
        <div className="landing-header-actions">
          <AppControls
            locale={locale}
            setLocale={setLocale}
            t={t}
            compact
          />
          <div className="landing-start-control" ref={startControlRef}>
            <button
              ref={startTriggerRef}
              type="button"
              className="landing-start-button"
              onClick={() => setShowStartMenu((current) => !current)}
              aria-expanded={showStartMenu}
              aria-controls="landing-start-menu"
              aria-haspopup="true"
            >
              <span>{t("startNow")}</span>
              <ArrowDown size={15} aria-hidden="true" />
            </button>
            {showStartMenu && (
              <div
                id="landing-start-menu"
                className="landing-start-menu"
              >
                <button type="button" onClick={startNewBadge}>
                  <span className="start-menu-icon" aria-hidden="true">
                    <Plus size={17} />
                  </span>
                  <span className="start-menu-copy">
                    <strong>{t("newBadge")}</strong>
                    <small>{t("newBadgeHelp")}</small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={!savedProjects.length}
                  onClick={() => {
                    setShowStartMenu(false);
                    setShowSavedProjects(true);
                  }}
                >
                  <span className="start-menu-icon" aria-hidden="true">
                    <FolderOpen size={17} />
                  </span>
                  <span className="start-menu-copy">
                    <strong>{t("continueDraft")}</strong>
                    <small>
                      {savedProjects.length
                        ? t("continueDraftHelp")
                        : t("noSavedDraft")}
                    </small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <h1 id="landing-title">
            {heroLineOne}
            <br />
            {heroLineTwo}
          </h1>
          <p>{t("heroDescription")}</p>
          <ol className="landing-flow" aria-label={t("workflow")}>
            <li>
              <Ruler size={15} />
              {t("chooseSize")}
            </li>
            <li className="landing-flow-arrow" aria-hidden="true">
              <ArrowRight size={14} />
            </li>
            <li>
              <FileText size={15} />
              {t("designRoster")}
            </li>
            <li className="landing-flow-arrow" aria-hidden="true">
              <ArrowRight size={14} />
            </li>
            <li>
              <ShieldCheck size={15} />
              {t("actualPdf")}
            </li>
          </ol>
        </section>

        <section
          className="service-overview"
          aria-labelledby="service-overview-title"
        >
          <div className="service-overview-heading">
            <h2 id="service-overview-title">{t("serviceTitle")}</h2>
            <p>{t("serviceDescription")}</p>
          </div>

          <article
            className="feature-story"
            aria-labelledby="feature-design-title"
          >
            <div className="feature-story-copy">
              <span className="feature-story-icon" aria-hidden="true">
                <LayoutTemplate size={22} />
              </span>
              <h3 id="feature-design-title">{t("featureDesignTitle")}</h3>
              <p>{t("featureDesignDescription")}</p>
              <ul>
                {[
                  t("featureDesignPointOne"),
                  t("featureDesignPointTwo"),
                  t("featureDesignPointThree"),
                ].map((point) => (
                  <li key={point}>
                    <Check size={16} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="feature-demo feature-demo-editor"
              role="img"
              aria-label={t("featureDesignVisualLabel")}
            >
              <div className="feature-demo-bar">
                <strong>LanyardStudio</strong>
                <span>95 × 123 mm</span>
              </div>
              <div className="feature-editor-layout">
                <div className="feature-editor-tools" aria-hidden="true">
                  <span>
                    <ImagePlus size={13} />
                    {t("backgroundImage")}
                  </span>
                  <span>
                    <Type size={13} />
                    {t("addText")}
                  </span>
                  <span>
                    <ImageIcon size={13} />
                    SVG
                  </span>
                </div>
                <div className="feature-editor-stage" aria-hidden="true">
                  <div className="feature-editor-badge">
                    <span className="feature-badge-logo">BF</span>
                    <span className="feature-guide is-vertical" />
                    <span className="feature-guide is-horizontal" />
                    <strong>{"{name}"}</strong>
                    <small>{"{team}"}</small>
                  </div>
                </div>
                <div className="feature-editor-properties" aria-hidden="true">
                  <strong>{t("variables")}</strong>
                  <span>{"{name}"}</span>
                  <span>{"{team}"}</span>
                  <strong>{t("badgeSize")}</strong>
                  <span>W 95 mm</span>
                  <span>H 123 mm</span>
                </div>
              </div>
            </div>
          </article>

          <article
            className="feature-story is-reversed"
            aria-labelledby="feature-data-title"
          >
            <div className="feature-story-copy">
              <span className="feature-story-icon" aria-hidden="true">
                <FileSpreadsheet size={22} />
              </span>
              <h3 id="feature-data-title">{t("featureDataTitle")}</h3>
              <p>{t("featureDataDescription")}</p>
              <ul>
                {[
                  t("featureDataPointOne"),
                  t("featureDataPointTwo"),
                  t("featureDataPointThree"),
                ].map((point) => (
                  <li key={point}>
                    <Check size={16} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="feature-demo feature-demo-data"
              role="img"
              aria-label={t("featureDataVisualLabel")}
            >
              <div className="feature-demo-bar">
                <strong>{t("badgeData")}</strong>
                <span>{t("totalPeople", { count: 3 })}</span>
              </div>
              <div className="feature-data-layout" aria-hidden="true">
                <div className="feature-data-table">
                  <div className="feature-data-row is-heading">
                    <span>{"{name}"}</span>
                    <span>{"{team}"}</span>
                    <span>{"{role}"}</span>
                  </div>
                  {[
                    ["김민지", "브랜드팀", "디자이너"],
                    ["이준호", "개발팀", "엔지니어"],
                    ["박서연", "운영팀", "매니저"],
                  ].map((row) => (
                    <div className="feature-data-row" key={row[0]}>
                      {row.map((cell) => (
                        <span key={cell}>{cell}</span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="feature-generated-badges">
                  {["김민지", "이준호", "박서연"].map((name, index) => (
                    <div className="feature-generated-badge" key={name}>
                      <i>BF</i>
                      <strong>{name}</strong>
                      <small>{["브랜드팀", "개발팀", "운영팀"][index]}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article
            className="feature-story"
            aria-labelledby="feature-print-title"
          >
            <div className="feature-story-copy">
              <span className="feature-story-icon" aria-hidden="true">
                <Printer size={22} />
              </span>
              <h3 id="feature-print-title">{t("featurePrintTitle")}</h3>
              <p>{t("featurePrintDescription")}</p>
              <ul>
                {[
                  t("featurePrintPointOne"),
                  t("featurePrintPointTwo"),
                  t("featurePrintPointThree"),
                ].map((point) => (
                  <li key={point}>
                    <Check size={16} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="feature-demo feature-demo-print"
              role="img"
              aria-label={t("featurePrintVisualLabel")}
            >
              <div className="feature-demo-bar">
                <strong>{t("printPreview")}</strong>
                <span>A4 · 100%</span>
              </div>
              <div className="feature-print-layout" aria-hidden="true">
                <div className="feature-print-sheet">
                  {["김민지", "이준호", "박서연", "최도윤"].map((name) => (
                    <span className="feature-print-badge" key={name}>
                      <i />
                      <strong>{name}</strong>
                      <small>LanyardStudio</small>
                    </span>
                  ))}
                </div>
                <div className="feature-print-settings">
                  <strong>{t("paper")}</strong>
                  <span>A4 · 210 × 297 mm</span>
                  <strong>{t("autoCenter")}</strong>
                  <span>{t("gridLayout", { columns: 2, rows: 2 })}</span>
                  <strong>{t("cropMarks")}</strong>
                  <span>{t("actualSize")}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section
          id="landing-presets"
          className="preset-section"
          aria-labelledby="preset-title"
        >
          <div className="preset-heading">
            <h2 id="preset-title" tabIndex={-1}>
              {t("presetTitle")}
            </h2>
            <p>{t("presetHelper")}</p>
          </div>

          <div className="preset-grid">
            {BADGE_PRESETS.map((preset) => {
              const isLandscape = preset.width > preset.height;
              const isSelected = preset.id === selectedPresetId;
              const presetName = t(preset.nameKey);
              const presetTag = preset.tagKey ? t(preset.tagKey) : preset.tag;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${preset.featured ? "is-featured" : ""} ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedPresetId(preset.id)}
                  aria-pressed={isSelected}
                  aria-describedby={
                    preset.productExamples
                      ? `preset-products-${preset.id}`
                      : undefined
                  }
                  aria-label={t("startSize", {
                    name: presetName,
                    width: displayNumber(preset.width),
                    height: displayNumber(preset.height),
                  })}
                >
                  <div className="preset-card-top">
                    <span className="preset-tag">{presetTag}</span>
                    <span className="preset-selection" aria-hidden="true">
                      {isSelected && <Check size={15} />}
                    </span>
                  </div>
                  <div className="preset-card-body">
                    <span className="preset-visual" aria-hidden="true">
                      {preset.outputMode === "table-tent" ? (
                        <span className="preset-mini-sheet">
                          <span className="preset-mini-face is-reversed">
                            <b>김민지</b>
                            <em>브랜드팀</em>
                          </span>
                          <i />
                          <span className="preset-mini-face">
                            <b>김민지</b>
                            <em>브랜드팀</em>
                          </span>
                        </span>
                      ) : (
                        <span
                          className={`preset-mini-badge ${isLandscape ? "is-landscape" : ""}`}
                          style={
                            {
                              "--preset-ratio": `${preset.width} / ${preset.height}`,
                            } as CSSProperties
                          }
                        >
                          {!isLandscape && <i />}
                          <b>김민지</b>
                          <em>브랜드팀</em>
                        </span>
                      )}
                    </span>
                    <span className="preset-copy">
                      <strong>{presetName}</strong>
                      <b>
                        {displayNumber(preset.width)} ×{" "}
                        {displayNumber(preset.height)} mm
                      </b>
                      <small>{t(preset.descriptionKey)}</small>
                      {preset.productExamples && (
                        <span
                          id={`preset-products-${preset.id}`}
                          className="preset-products"
                        >
                          <span className="preset-products-title">
                            {t("productExamples")}
                          </span>
                          <span className="preset-product-list">
                            {preset.productExamples.map((product) => (
                              <span
                                className="preset-product-item"
                                key={product.nameEn}
                              >
                                <span>
                                  {locale === "ko"
                                    ? product.nameKo
                                    : product.nameEn}
                                </span>
                                <em>
                                  {t(
                                    product.fit === "paper"
                                      ? "productPaperSize"
                                      : product.fit === "exact"
                                        ? "productInnerSize"
                                        : "productOuterSizeCheck",
                                    { size: product.size },
                                  )}
                                </em>
                              </span>
                            ))}
                          </span>
                          <span className="preset-products-note">
                            {t(
                              preset.productNoteKey ??
                                "productSizeDisclaimer",
                              {
                                size: `${displayNumber(preset.width)} × ${displayNumber(preset.height)} mm`,
                              },
                            )}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="preset-card-footer">
                    <span>
                      {preset.outputMode === "table-tent"
                        ? t("onePersonPerA4")
                        : t("perA4", { count: preset.a4Count })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="preset-actions">
            <button
              type="button"
              className="custom-size-button"
              onClick={onCustom}
            >
              <CreditCard size={17} />
              {t("customSize")}
            </button>
            <button
              type="button"
              className="create-selected-preset-button"
              disabled={!selectedPreset}
              onClick={() => {
                if (selectedPreset) onSelectPreset(selectedPreset);
              }}
            >
              {t("usePreset")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      {showSavedProjects && (
        <div
          className="saved-project-overlay"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return;
            setShowSavedProjects(false);
            window.requestAnimationFrame(() => startTriggerRef.current?.focus());
          }}
        >
          <section
            ref={savedDialogRef}
            className="saved-project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-project-dialog-title"
            aria-describedby="saved-project-dialog-help"
          >
            <div className="saved-project-dialog-heading">
              <div>
                <h2 id="saved-project-dialog-title">
                  {t("savedProjectsTitle")}
                </h2>
                <p id="saved-project-dialog-help">{t("savedProjectsHelp")}</p>
              </div>
              <button
                ref={savedDialogCloseRef}
                type="button"
                className="saved-project-close"
                onClick={() => {
                  setShowSavedProjects(false);
                  window.requestAnimationFrame(() =>
                    startTriggerRef.current?.focus(),
                  );
                }}
                aria-label={t("closeSavedProjects")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="saved-project-list">
              {!savedProjects.length && (
                <div className="saved-project-empty">
                  <FolderOpen size={24} aria-hidden="true" />
                  <p>{t("noSavedDraft")}</p>
                </div>
              )}
              {savedProjects.map((project) => (
                <article className="saved-project-item" key={project.id}>
                  <button
                    type="button"
                    className="saved-project-open"
                    disabled={openingProjectId !== null}
                    onClick={() => void openSavedProject(project.id)}
                  >
                    <span className="saved-project-thumbnail" aria-hidden="true">
                      <span
                        style={
                          {
                            "--saved-project-ratio": `${project.badgeWidth} / ${project.badgeHeight}`,
                          } as CSSProperties
                        }
                      >
                        <i />
                        <b>LS</b>
                      </span>
                    </span>
                    <span className="saved-project-copy">
                      <strong>{project.name}</strong>
                      <span>
                        {displayNumber(project.badgeWidth)} ×{" "}
                        {displayNumber(project.badgeHeight)} mm ·{" "}
                        {t("totalPeople", { count: project.rowCount })}
                      </span>
                      <small>
                        {t("savedProjectUpdated", {
                          date: formatSavedProjectDate(project.updatedAt),
                        })}
                      </small>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <div className="saved-project-actions">
                    <button
                      type="button"
                      className="saved-project-rename"
                      disabled={openingProjectId !== null || isRenamingProject}
                      onClick={() => beginRenameProject(project)}
                      aria-label={t("renameSavedProject", {
                        name: project.name,
                      })}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="saved-project-delete"
                      disabled={openingProjectId !== null || isRenamingProject}
                      onClick={() => void deleteSavedProject(project)}
                      aria-label={t("deleteSavedProject", {
                        name: project.name,
                      })}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {renamingProjectId === project.id && (
                    <form
                      className="saved-project-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitProjectRename(project);
                      }}
                    >
                      <label htmlFor={`rename-project-${project.id}`}>
                        {t("projectName")}
                      </label>
                      <input
                        ref={renameInputRef}
                        id={`rename-project-${project.id}`}
                        value={renameDraft}
                        maxLength={MAX_PROJECT_NAME_LENGTH}
                        disabled={isRenamingProject}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Escape") return;
                          event.preventDefault();
                          cancelRenameProject();
                        }}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isRenamingProject}
                        onClick={cancelRenameProject}
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={isRenamingProject || !renameDraft.trim()}
                      >
                        {isRenamingProject ? t("saving") : t("saveName")}
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>

            {projectListError && (
              <p className="saved-project-error" role="alert">
                <AlertTriangle size={15} aria-hidden="true" />
                {projectListError}
              </p>
            )}
          </section>
        </div>
      )}

      <footer className="landing-footer">
        <span>LanyardStudio</span>
        <span>{t("localOnly")}</span>
      </footer>
    </div>
  );
}

function makeId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return (
    <img
      className={className}
      src={withBasePath("/brand/lanyardstudio-mark.svg")}
      width={36}
      height={36}
      alt=""
      aria-hidden="true"
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function displayNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getDefaultBrandBarDimensions(
  direction: BrandBarDirection,
  badgeWidth: number,
  badgeHeight: number,
) {
  if (direction === "vertical") {
    return {
      width: Math.max(14, Math.min(30, badgeWidth * 0.32)),
      height: Math.max(32, Math.min(82, badgeHeight * 0.72)),
    };
  }
  return {
    width: Math.max(32, Math.min(82, badgeWidth * 0.86)),
    height: Math.max(14, Math.min(28, badgeHeight * 0.23)),
  };
}

function normalizeProjectName(value: string, fallback: string) {
  return value.trim().slice(0, MAX_PROJECT_NAME_LENGTH) || fallback;
}

function getElementLabel(element: CanvasElement, t?: Translate) {
  if (element.name) return element.name;
  if (element.type === "brandBar") return t?.("brandBar") || "Brand bar";
  if (element.type === "image") return t?.("imageGeneric") || "Image";
  if (element.type === "shape") return t?.("shapeGeneric") || "Shape";
  if (element.kind === "variable")
    return element.field || t?.("variable") || "Variable";
  return element.value || t?.("fixedText") || "Fixed text";
}

function cloneElements(source: CanvasElement[]) {
  return source.map((element) =>
    element.type === "brandBar"
      ? {
          ...element,
          logos: element.logos.map((logo) => ({ ...logo })),
        }
      : { ...element },
  ) as CanvasElement[];
}

function cloneRows(source: BadgeRow[]) {
  return source.map((row) => ({ ...row }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

function boundedString(value: unknown, fallback = "", maxLength = MAX_CELL_LENGTH) {
  return typeof value === "string"
    ? value.split(String.fromCharCode(0)).join("").slice(0, maxLength)
    : fallback;
}

function isSafeImageDataUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return false;
  }
  return (
    /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) ||
    /^data:image\/svg\+xml(?:;charset=utf-8)?,/i.test(value)
  );
}

function normalizedColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[\da-f]{3,8}$/i.test(value)
    ? value
    : fallback;
}

function normalizeElement(element: unknown): CanvasElement | null {
  if (!isRecord(element)) return null;
  const common = {
    id: boundedString(element.id, makeId("element"), 120) || makeId("element"),
    groupId:
      typeof element.groupId === "string" && element.groupId.trim()
        ? boundedString(element.groupId, "", 120)
        : undefined,
    x: boundedNumber(element.x, 0, -500, 500),
    y: boundedNumber(element.y, 0, -500, 500),
    width: boundedNumber(element.width, 20, 1, 500),
    opacity: boundedNumber(element.opacity, 1, 0, 1),
    rotation: boundedNumber(element.rotation, 0, -180, 180),
    locked: Boolean(element.locked),
    hidden: Boolean(element.hidden),
  };

  if (element.type === "brandBar") {
    const direction: BrandBarDirection =
      element.direction === "vertical" ? "vertical" : "horizontal";
    const logos = Array.isArray(element.logos)
      ? element.logos.slice(0, MAX_BRAND_LOGOS).flatMap((candidate) => {
          if (!isRecord(candidate) || !isSafeImageDataUrl(candidate.src)) {
            return [];
          }
          return [
            {
              id:
                boundedString(candidate.id, makeId("brand-logo"), 120) ||
                makeId("brand-logo"),
              name:
                boundedString(candidate.name, "Logo", 160).trim() || "Logo",
              src: candidate.src,
              mimeType: boundedString(candidate.mimeType, "image/png", 80),
              aspectRatio: boundedNumber(candidate.aspectRatio, 1, 0.01, 100),
              cropX: boundedNumber(candidate.cropX, 50, 0, 100),
              cropY: boundedNumber(candidate.cropY, 50, 0, 100),
              zoom: boundedNumber(candidate.zoom, 1, 1, 4),
            },
          ];
        })
      : [];
    if (!logos.length) return null;
    return {
      ...common,
      type: "brandBar",
      name: boundedString(element.name, "Brand bar", 160) || "Brand bar",
      height: boundedNumber(element.height, 24, 5, 500),
      direction,
      gap: boundedNumber(element.gap, 2, 0, 100),
      padding: boundedNumber(element.padding, 2, 0, 100),
      backgroundColor: normalizedColor(element.backgroundColor, "#ffffff"),
      cornerRadius: boundedNumber(element.cornerRadius, 2, 0, 250),
      logos,
    };
  }

  if (element.type === "image") {
    if (!isSafeImageDataUrl(element.src)) return null;
    const fit: BackgroundFit = ["cover", "contain", "stretch"].includes(
      String(element.fit),
    )
      ? (element.fit as BackgroundFit)
      : "contain";
    return {
      ...common,
      type: "image",
      name: boundedString(element.name, "Image", 160) || "Image",
      src: element.src,
      mimeType: boundedString(element.mimeType, "image/png", 80),
      height: boundedNumber(element.height, 20, 1, 500),
      fit,
      aspectRatio: boundedNumber(element.aspectRatio, 1, 0.01, 100),
      sourceKind: element.sourceKind === "qr" ? "qr" : "upload",
      qrValue:
        element.sourceKind === "qr"
          ? boundedString(element.qrValue, "", MAX_CELL_LENGTH)
          : undefined,
    };
  }

  if (element.type === "shape") {
    const shapeKind: ShapeKind = ["rectangle", "ellipse", "line"].includes(
      String(element.shapeKind),
    )
      ? (element.shapeKind as ShapeKind)
      : "rectangle";
    return {
      ...common,
      name:
        boundedString(element.name, shapeKind === "line" ? "Line" : "Shape", 160).trim() ||
        "Shape",
      type: "shape",
      shapeKind,
      height: boundedNumber(
        element.height,
        shapeKind === "line" ? 1.5 : 20,
        0.5,
        500,
      ),
      fill: normalizedColor(element.fill, "#dbeafe"),
      stroke: normalizedColor(element.stroke, "#2563eb"),
      strokeWidth: boundedNumber(element.strokeWidth, 0.8, 0, 20),
      cornerRadius: boundedNumber(element.cornerRadius, 2, 0, 250),
    };
  }

  if (element.type !== "text") return null;
  const kind: ElementKind =
    element.kind === "variable" ? "variable" : "static";
  const align: Align = ["left", "center", "right"].includes(
    String(element.align),
  )
    ? (element.align as Align)
    : "center";
  const color = normalizedColor(element.color, "#17201f");
  const fontFamily = FONT_FAMILY_KEYS.has(
    element.fontFamily as FontFamilyKey,
  )
    ? (element.fontFamily as FontFamilyKey)
    : "sans";
  const field = boundedString(element.field, "", MAX_FIELD_LENGTH);
  const value =
    kind === "static"
      ? boundedString(element.value, "", MAX_CELL_LENGTH)
      : "";
  return {
    ...common,
    name:
      boundedString(
        element.name,
        kind === "variable" ? field || "Text" : value || "Text",
        160,
      ).trim() || "Text",
    type: "text",
    kind,
    field:
      kind === "variable"
        ? FORBIDDEN_FIELD_NAMES.has(field)
          ? ""
          : field
        : undefined,
    value:
      kind === "static"
        ? value
        : undefined,
    fontSize: boundedNumber(element.fontSize, 12, 1, 200),
    fontWeight: boundedNumber(element.fontWeight, 500, 100, 900),
    fontFamily,
    color,
    align,
  };
}

function normalizeFields(
  value: unknown,
  fallback: string[] = DEFAULT_FIELDS,
) {
  if (!Array.isArray(value)) return [...fallback];
  const fields = value
    .map((field) => boundedString(field, "", MAX_FIELD_LENGTH).trim())
    .filter(
      (field, index, list) =>
        Boolean(field) &&
        !FORBIDDEN_FIELD_NAMES.has(field) &&
        list.indexOf(field) === index,
    )
    .slice(0, MAX_FIELDS);
  return fields.length ? fields : [...fallback];
}

function normalizeRows(value: unknown, fields: string[]) {
  if (!Array.isArray(value)) return SAMPLE_ROWS.map((row) => ({ ...row }));
  const usedIds = new Set<string>();
  return value.slice(0, MAX_ROWS).flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    let id = boundedString(candidate.id, makeId("row"), 120) || makeId("row");
    if (usedIds.has(id)) id = makeId("row");
    usedIds.add(id);
    const row: BadgeRow = {
      id,
    };
    fields.forEach((field) => {
      row[field] = boundedString(candidate[field], "", MAX_CELL_LENGTH);
    });
    return [row];
  });
}

function normalizePage(value: unknown): PageSettings {
  if (!isRecord(value)) return { ...DEFAULT_PAGE };
  const preset: PagePreset = ["A4", "A3", "Letter", "custom"].includes(
    String(value.preset),
  )
    ? (value.preset as PagePreset)
    : "A4";
  return {
    preset,
    width: boundedNumber(value.width, DEFAULT_PAGE.width, 50, 2_000),
    height: boundedNumber(value.height, DEFAULT_PAGE.height, 50, 2_000),
    gapX: boundedNumber(value.gapX, 0, 0, 100),
    gapY: boundedNumber(value.gapY, 0, 0, 100),
    showOutline:
      typeof value.showOutline === "boolean"
        ? value.showOutline
        : DEFAULT_PAGE.showOutline,
    showCropMarks:
      typeof value.showCropMarks === "boolean"
        ? value.showCropMarks
        : DEFAULT_PAGE.showCropMarks,
  };
}

function normalizeProject(value: unknown): BadgeProject | null {
  if (!isRecord(value)) return null;
  if (value.format !== undefined && value.format !== PROJECT_FORMAT) {
    return null;
  }
  if (
    typeof value.version === "number" &&
    value.version > PROJECT_VERSION
  ) {
    return null;
  }
  const outputMode: OutputMode =
    value.outputMode === "table-tent" ? "table-tent" : "standard";
  const badgeWidth =
    outputMode === "table-tent"
      ? 297
      : boundedNumber(value.badgeWidth, 95, 20, 500);
  const badgeHeight =
    outputMode === "table-tent"
      ? 105
      : boundedNumber(value.badgeHeight, 123, 20, 500);
  const shouldMigratePersonName =
    (typeof value.version !== "number" || value.version < 9) &&
    Array.isArray(value.fields) &&
    value.fields.some((field) => field === "이름") &&
    !value.fields.some((field) => field === "사람 이름");
  const sourceFields = shouldMigratePersonName
    && Array.isArray(value.fields)
    ? value.fields.map((field: unknown) =>
        field === "이름" ? "사람 이름" : field,
      )
    : value.fields;
  const sourceRows =
    shouldMigratePersonName && Array.isArray(value.rows)
      ? value.rows.map((row) =>
          isRecord(row)
            ? { ...row, "사람 이름": row.이름 }
            : row,
        )
      : value.rows;
  const sourceElements =
    shouldMigratePersonName && Array.isArray(value.elements)
      ? value.elements.map((element) => {
          if (!isRecord(element)) return element;
          const defaultName =
            element.id === "element-name" && element.name === "이름"
              ? "이름 텍스트"
              : element.id === "element-team" && element.name === "팀"
                ? "팀 텍스트"
                : element.id === "element-title" && element.name === "직책"
                  ? "직책 텍스트"
                  : element.name;
          return element.type === "text" && element.field === "이름"
            ? { ...element, name: defaultName, field: "사람 이름" }
            : { ...element, name: defaultName };
        })
      : value.elements;
  const fields = normalizeFields(sourceFields);
  const rows = normalizeRows(sourceRows, fields);
  const usedElementIds = new Set<string>();
  const elements = Array.isArray(sourceElements)
    ? sourceElements
        .slice(0, MAX_ELEMENTS)
        .map(normalizeElement)
        .filter((element): element is CanvasElement => Boolean(element))
        .map((element) => {
          const width = Math.min(element.width, badgeWidth * 2);
          if (element.type === "image") {
            const height = Math.min(element.height, badgeHeight * 2);
            const sizedElement = { ...element, width, height };
            const bounds = getElementMoveBounds(
              sizedElement,
              badgeWidth,
              badgeHeight,
            );
            return {
              ...sizedElement,
              x: clamp(element.x, bounds.minX, bounds.maxX),
              y: clamp(element.y, bounds.minY, bounds.maxY),
            };
          }
          if (element.type === "shape") {
            const height = Math.min(element.height, badgeHeight * 2);
            const sizedElement = { ...element, width, height };
            const bounds = getElementMoveBounds(
              sizedElement,
              badgeWidth,
              badgeHeight,
            );
            return {
              ...sizedElement,
              x: clamp(element.x, bounds.minX, bounds.maxX),
              y: clamp(element.y, bounds.minY, bounds.maxY),
            };
          }
          if (element.type === "brandBar") {
            const height = Math.min(element.height, badgeHeight * 2);
            const maxInset = Math.max(0, Math.min(width, height) / 2 - 0.1);
            const sizedElement = {
              ...element,
              width,
              height,
              padding: Math.min(element.padding, maxInset),
              gap: Math.min(
                element.gap,
                element.direction === "horizontal" ? width : height,
              ),
            };
            const bounds = getElementMoveBounds(
              sizedElement,
              badgeWidth,
              badgeHeight,
            );
            return {
              ...sizedElement,
              x: clamp(element.x, bounds.minX, bounds.maxX),
              y: clamp(element.y, bounds.minY, bounds.maxY),
            };
          }
          const sizedElement = { ...element, width };
          const bounds = getElementMoveBounds(
            sizedElement,
            badgeWidth,
            badgeHeight,
          );
          return {
            ...sizedElement,
            x: clamp(element.x, bounds.minX, bounds.maxX),
            y: clamp(element.y, bounds.minY, bounds.maxY),
          };
        })
        .map((element) => {
          let id = element.id;
          if (usedElementIds.has(id)) id = makeId("element");
          usedElementIds.add(id);
          return id === element.id ? element : { ...element, id };
        })
    : [];
  if (!elements.length) return null;

  const backgroundFit: BackgroundFit = ["cover", "contain", "stretch"].includes(
    String(value.backgroundFit),
  )
    ? (value.backgroundFit as BackgroundFit)
    : "cover";
  const background =
    value.background === null || value.background === undefined
      ? null
      : isSafeImageDataUrl(value.background)
        ? value.background
        : null;
  const backgroundColor =
    typeof value.backgroundColor === "string" &&
    /^#[\da-f]{3,8}$/i.test(value.backgroundColor)
      ? value.backgroundColor
      : "#ffffff";

  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    updatedAt: new Date().toISOString(),
    badgeWidth,
    badgeHeight,
    safeArea: boundedNumber(
      value.safeArea,
      5,
      0,
      Math.min(badgeWidth, badgeHeight) / 2,
    ),
    backgroundColor,
    background,
    backgroundName: boundedString(value.backgroundName, "", 240),
    backgroundFit,
    elements,
    fields,
    rows,
    page:
      outputMode === "table-tent"
        ? { ...TABLE_TENT_PAGE }
        : normalizePage(value.page),
    dpi: [150, 300, 600].includes(Number(value.dpi))
      ? Number(value.dpi)
      : 300,
    outputMode,
  };
}

function resolveText(
  element: TextElement,
  row: BadgeRow | undefined,
  showPlaceholder = true,
) {
  if (element.kind === "static") return element.value || "Fixed text";
  if (!element.field) return "";
  const value = row?.[element.field];
  return value || (showPlaceholder ? `{{${element.field}}}` : "");
}

function getElementVisualHeight(element: CanvasElement) {
  if (element.type !== "text") return element.height;
  return Math.max(2.5, element.fontSize * 0.352778 * 1.15);
}

function getElementRect(element: CanvasElement) {
  const height = getElementVisualHeight(element);
  return {
    left: element.x,
    top: element.type === "text" ? element.y - height / 2 : element.y,
    right: element.x + element.width,
    bottom:
      element.type === "text" ? element.y + height / 2 : element.y + height,
  };
}

function getElementMoveBounds(
  element: CanvasElement,
  badgeWidth: number,
  badgeHeight: number,
) {
  const height = getElementVisualHeight(element);
  const visibleX = Math.min(5, Math.max(1, element.width * 0.25));
  const visibleY = Math.min(5, Math.max(1, height * 0.25));
  return {
    minX: -element.width + visibleX,
    maxX: badgeWidth - visibleX,
    minY:
      element.type === "text"
        ? -height / 2 + visibleY
        : -height + visibleY,
    maxY:
      element.type === "text"
        ? badgeHeight + height / 2 - visibleY
        : badgeHeight - visibleY,
  };
}

function getSelectionRect(elements: CanvasElement[]) {
  if (!elements.length) return null;
  return elements.reduce(
    (bounds, element) => {
      const rect = getElementRect(element);
      return {
        left: Math.min(bounds.left, rect.left),
        top: Math.min(bounds.top, rect.top),
        right: Math.max(bounds.right, rect.right),
        bottom: Math.max(bounds.bottom, rect.bottom),
      };
    },
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  );
}

function getPageLayout(
  page: PageSettings,
  badgeWidth: number,
  badgeHeight: number,
) {
  const columns = Math.max(
    0,
    Math.floor((page.width + page.gapX) / (badgeWidth + page.gapX)),
  );
  const rows = Math.max(
    0,
    Math.floor((page.height + page.gapY) / (badgeHeight + page.gapY)),
  );
  const capacity = columns * rows;
  const contentWidth =
    columns > 0 ? columns * badgeWidth + (columns - 1) * page.gapX : 0;
  const contentHeight =
    rows > 0 ? rows * badgeHeight + (rows - 1) * page.gapY : 0;

  return {
    columns,
    rows,
    capacity,
    startX: (page.width - contentWidth) / 2,
    startY: (page.height - contentHeight) / 2,
    fits: capacity > 0,
  };
}

function getImageType(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

const imageAssetCache = new Map<string, Promise<HTMLImageElement>>();
const MAX_CACHED_IMAGES = 64;

function loadImage(src: string) {
  const cached = imageAssetCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the image."));
    image.src = src;
  });
  imageAssetCache.set(src, promise);
  if (imageAssetCache.size > MAX_CACHED_IMAGES) {
    const oldestKey = imageAssetCache.keys().next().value;
    if (oldestKey) imageAssetCache.delete(oldestKey);
  }
  promise.catch(() => imageAssetCache.delete(src));
  return promise;
}

function drawImageFitted(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: BackgroundFit,
) {
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  if (fit === "stretch") {
    context.drawImage(image, x, y, width, height);
    context.restore();
    return;
  }

  const scaleFactor =
    fit === "cover"
      ? Math.max(width / image.width, height / image.height)
      : Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scaleFactor;
  const drawHeight = image.height * scaleFactor;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

function getBrandBarSlots(element: BrandBarElement) {
  const count = Math.max(1, element.logos.length);
  const padding = Math.min(
    element.padding,
    Math.max(0, Math.min(element.width, element.height) / 2 - 0.1),
  );
  const innerWidth = Math.max(0.1, element.width - padding * 2);
  const innerHeight = Math.max(0.1, element.height - padding * 2);
  const availableLength =
    element.direction === "horizontal" ? innerWidth : innerHeight;
  const gap = Math.min(
    element.gap,
    count > 1 ? Math.max(0, (availableLength - count * 0.1) / (count - 1)) : 0,
  );
  const cellLength = Math.max(
    0.1,
    (availableLength - gap * (count - 1)) / count,
  );

  return element.logos.map((logo, index) => ({
    logo,
    x:
      element.direction === "horizontal"
        ? padding + index * (cellLength + gap)
        : padding,
    y:
      element.direction === "vertical"
        ? padding + index * (cellLength + gap)
        : padding,
    width: element.direction === "horizontal" ? cellLength : innerWidth,
    height: element.direction === "vertical" ? cellLength : innerHeight,
  }));
}

function getBrandLogoStyle(
  logo: BrandLogo,
  slotWidth: number,
  slotHeight: number,
) {
  const slotAspectRatio = slotWidth / Math.max(0.01, slotHeight);
  const baseWidth =
    logo.aspectRatio > slotAspectRatio
      ? (logo.aspectRatio / slotAspectRatio) * 100
      : 100;
  const baseHeight =
    logo.aspectRatio > slotAspectRatio
      ? 100
      : (slotAspectRatio / logo.aspectRatio) * 100;
  const width = baseWidth * logo.zoom;
  const height = baseHeight * logo.zoom;
  return {
    width: `${width}%`,
    height: `${height}%`,
    left: `${-((width - 100) * logo.cropX) / 100}%`,
    top: `${-((height - 100) * logo.cropY) / 100}%`,
  } as CSSProperties;
}

function drawBrandLogoCropped(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  logo: BrandLogo,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scaleFactor =
    Math.max(width / image.width, height / image.height) * logo.zoom;
  const drawWidth = image.width * scaleFactor;
  const drawHeight = image.height * scaleFactor;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.drawImage(
    image,
    x - (drawWidth - width) * (logo.cropX / 100),
    y - (drawHeight - height) * (logo.cropY / 100),
    drawWidth,
    drawHeight,
  );
  context.restore();
}

async function renderBadgeImage({
  badgeWidth,
  badgeHeight,
  backgroundColor,
  background,
  backgroundFit,
  elements,
  row,
  dpi,
}: {
  badgeWidth: number;
  badgeHeight: number;
  backgroundColor: string;
  background: string | null;
  backgroundFit: BackgroundFit;
  elements: CanvasElement[];
  row: BadgeRow;
  dpi: number;
}) {
  const scale = dpi / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(badgeWidth * scale));
  canvas.height = Math.max(1, Math.round(badgeHeight * scale));
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not create the print canvas.");

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (background) {
    const image = await loadImage(background);
    drawImageFitted(
      context,
      image,
      0,
      0,
      canvas.width,
      canvas.height,
      backgroundFit,
    );
  }

  for (const element of elements) {
    if (element.hidden) continue;

    if (element.type === "brandBar") {
      const width = element.width * scale;
      const height = element.height * scale;
      context.save();
      context.globalAlpha = element.opacity;
      context.translate(
        (element.x + element.width / 2) * scale,
        (element.y + element.height / 2) * scale,
      );
      context.rotate((element.rotation * Math.PI) / 180);
      context.beginPath();
      context.roundRect(
        -width / 2,
        -height / 2,
        width,
        height,
        Math.min(element.cornerRadius * scale, width / 2, height / 2),
      );
      context.fillStyle = element.backgroundColor;
      context.fill();
      context.clip();
      for (const slot of getBrandBarSlots(element)) {
        const image = await loadImage(slot.logo.src);
        drawBrandLogoCropped(
          context,
          image,
          slot.logo,
          -width / 2 + slot.x * scale,
          -height / 2 + slot.y * scale,
          slot.width * scale,
          slot.height * scale,
        );
      }
      context.restore();
      continue;
    }

    if (element.type === "image") {
      const image = await loadImage(element.src);
      const x = element.x * scale;
      const y = element.y * scale;
      const width = element.width * scale;
      const height = element.height * scale;
      context.save();
      context.globalAlpha = element.opacity;
      context.translate(x + width / 2, y + height / 2);
      context.rotate((element.rotation * Math.PI) / 180);
      drawImageFitted(
        context,
        image,
        -width / 2,
        -height / 2,
        width,
        height,
        element.fit,
      );
      context.restore();
      continue;
    }

    if (element.type === "shape") {
      const width = element.width * scale;
      const height = element.height * scale;
      context.save();
      context.globalAlpha = element.opacity;
      context.translate(
        (element.x + element.width / 2) * scale,
        (element.y + element.height / 2) * scale,
      );
      context.rotate((element.rotation * Math.PI) / 180);
      if (element.shapeKind === "line") {
        context.fillStyle = element.stroke;
        context.fillRect(-width / 2, -height / 2, width, height);
      } else {
        context.beginPath();
        if (element.shapeKind === "ellipse") {
          context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        } else {
          const radius = Math.min(
            element.cornerRadius * scale,
            width / 2,
            height / 2,
          );
          context.roundRect(-width / 2, -height / 2, width, height, radius);
        }
        context.fillStyle = element.fill;
        context.fill();
        if (element.strokeWidth > 0) {
          context.lineWidth = element.strokeWidth * scale;
          context.strokeStyle = element.stroke;
          context.stroke();
        }
      }
      context.restore();
      continue;
    }

    const text = resolveText(element, row, false);
    if (!text) continue;

    const maxWidth = element.width * scale;
    const intendedFontSize = element.fontSize * (dpi / 72);
    let fontSize = intendedFontSize;
    const fontFamily = getFontFamily(element.fontFamily);
    context.font = `${element.fontWeight} ${fontSize}px ${fontFamily}`;

    const longestLine = text
      .split("\n")
      .reduce((longest, line) =>
        context.measureText(line).width > context.measureText(longest).width
          ? line
          : longest,
      );
    const measured = context.measureText(longestLine).width;

    if (measured > maxWidth) {
      fontSize = Math.max(intendedFontSize * 0.55, intendedFontSize * (maxWidth / measured));
      context.font = `${element.fontWeight} ${fontSize}px ${fontFamily}`;
    }

    context.save();
    context.globalAlpha = element.opacity;
    const rotationCenterX = (element.x + element.width / 2) * scale;
    const rotationCenterY = element.y * scale;
    context.translate(rotationCenterX, rotationCenterY);
    context.rotate((element.rotation * Math.PI) / 180);
    context.translate(-rotationCenterX, -rotationCenterY);
    context.fillStyle = element.color;
    context.textBaseline = "middle";
    context.textAlign = element.align;

    const x =
      element.align === "left"
        ? element.x * scale
        : element.align === "right"
          ? (element.x + element.width) * scale
          : (element.x + element.width / 2) * scale;
    const lines = text.split("\n");
    const lineHeight = fontSize * 1.18;
    const firstY =
      element.y * scale - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      context.fillText(line, x, firstY + index * lineHeight, maxWidth);
    });
    context.restore();
  }

  return elements.some(
    (element) => element.type === "image" && element.sourceKind === "qr",
  )
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.96);
}

async function rotateBadgeImage180(dataUrl: string) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not rotate the print image.");
  context.translate(canvas.width, canvas.height);
  context.rotate(Math.PI);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.96);
}

function BadgeContents({
  badgeWidth,
  badgeHeight,
  safeArea = 5,
  backgroundColor = "#ffffff",
  background,
  backgroundFit,
  elements,
  row,
  selectedElementIds = [],
  snapGuides,
  interactive = false,
  onSelect,
  onPointerDown,
  onResizePointerDown,
  onPointerMove,
  onPointerUp,
  onKeyMove,
  onElementContextMenu,
  t,
}: {
  badgeWidth: number;
  badgeHeight: number;
  safeArea?: number;
  backgroundColor?: string;
  background: string | null;
  backgroundFit: BackgroundFit;
  elements: CanvasElement[];
  row: BadgeRow | undefined;
  t: Translate;
  selectedElementIds?: string[];
  snapGuides?: SnapGuides;
  interactive?: boolean;
  onSelect?: (id: string, additive?: boolean) => void;
  onPointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
  onResizePointerDown?: (
    event: ReactPointerEvent<HTMLSpanElement>,
    element: CanvasElement,
    direction: ResizeDirection,
  ) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyMove?: (
    event: React.KeyboardEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
  onElementContextMenu?: (
    event: ReactMouseEvent<HTMLDivElement>,
    element: CanvasElement,
  ) => void;
}) {
  const stageStyle = {
    "--badge-ratio": `${badgeWidth} / ${badgeHeight}`,
    backgroundImage: background ? `url("${background}")` : undefined,
    backgroundColor,
    backgroundSize:
      backgroundFit === "stretch" ? "100% 100%" : backgroundFit,
  } as CSSProperties;
  const selectionSet = new Set(selectedElementIds);
  const selectionRect =
    interactive && selectedElementIds.length > 1
      ? getSelectionRect(
          elements.filter(
            (element) => !element.hidden && selectionSet.has(element.id),
          ),
        )
      : null;

  return (
    <div
      className={`badge-surface ${interactive ? "is-interactive" : ""}`}
      style={stageStyle}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      {!background && interactive && (
        <div className="empty-background" aria-hidden="true">
          <ImagePlus size={22} />
          <span>{t("emptyBackground")}</span>
        </div>
      )}
      <div
        className="safe-area"
        style={{
          inset: `${(safeArea / badgeHeight) * 100}% ${(safeArea / badgeWidth) * 100}%`,
        }}
        aria-hidden="true"
      />
      {interactive && snapGuides?.vertical && (
        <div className="alignment-guide guide-vertical" aria-hidden="true">
          <span>{t("guideHorizontal")}</span>
        </div>
      )}
      {interactive && snapGuides?.horizontal && (
        <div className="alignment-guide guide-horizontal" aria-hidden="true">
          <span>{t("guideVertical")}</span>
        </div>
      )}
      {interactive && snapGuides?.vertical && snapGuides.horizontal && (
        <span className="alignment-center-point" aria-hidden="true" />
      )}
      {selectionRect && (
        <div
          className="multi-selection-outline"
          style={{
            left: `${(selectionRect.left / badgeWidth) * 100}%`,
            top: `${(selectionRect.top / badgeHeight) * 100}%`,
            width: `${((selectionRect.right - selectionRect.left) / badgeWidth) * 100}%`,
            height: `${((selectionRect.bottom - selectionRect.top) / badgeHeight) * 100}%`,
          }}
          aria-hidden="true"
        />
      )}
      {elements.map((element, index) => {
        if (element.hidden) return null;
        const isSelected = selectionSet.has(element.id);
        const elementLabel = getElementLabel(element, t);

        if (element.type === "brandBar") {
          const brandBarStyle = {
            left: `${(element.x / badgeWidth) * 100}%`,
            top: `${(element.y / badgeHeight) * 100}%`,
            width: `${(element.width / badgeWidth) * 100}%`,
            height: `${(element.height / badgeHeight) * 100}%`,
            opacity: element.opacity,
            transform: `rotate(${element.rotation}deg)`,
            zIndex: index + 2,
            borderRadius: `${Math.min(
              50,
              (element.cornerRadius /
                Math.max(0.1, Math.min(element.width, element.height))) *
                100,
            )}%`,
            cursor: interactive
              ? element.locked
                ? "not-allowed"
                : "grab"
              : "default",
          } as CSSProperties;
          const interactionProps = interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                "aria-pressed": isSelected,
                "aria-label": t("brandBarElement", { name: elementLabel }),
                onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                  event.stopPropagation();
                  if (event.detail === 0) onSelect?.(element.id, false);
                },
                onPointerDown: (
                  event: ReactPointerEvent<HTMLDivElement>,
                ) => {
                  event.currentTarget.focus({ preventScroll: true });
                  onPointerDown?.(event, element);
                },
                onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) =>
                  onKeyMove?.(event, element),
                onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) =>
                  onElementContextMenu?.(event, element),
              }
            : {};

          return (
            <div
              key={element.id}
              className={`badge-brand-bar ${isSelected ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
              style={brandBarStyle}
              {...interactionProps}
            >
              <span
                className="brand-bar-visual"
                style={{ background: element.backgroundColor }}
              >
                {getBrandBarSlots(element).map((slot) => (
                  <span
                    key={slot.logo.id}
                    className="brand-logo-slot"
                    style={{
                      left: `${(slot.x / element.width) * 100}%`,
                      top: `${(slot.y / element.height) * 100}%`,
                      width: `${(slot.width / element.width) * 100}%`,
                      height: `${(slot.height / element.height) * 100}%`,
                    }}
                  >
                    <img
                      src={slot.logo.src}
                      alt=""
                      draggable={false}
                      style={getBrandLogoStyle(
                        slot.logo,
                        slot.width,
                        slot.height,
                      )}
                    />
                  </span>
                ))}
              </span>
              {interactive &&
                isSelected &&
                selectedElementIds.length === 1 &&
                !element.locked &&
                RESIZE_DIRECTIONS.map((direction) => (
                  <span
                    key={direction}
                    className={`selection-handle handle-${direction}`}
                    onPointerDown={(event) =>
                      onResizePointerDown?.(event, element, direction)
                    }
                    aria-hidden="true"
                  />
                ))}
            </div>
          );
        }

        if (element.type === "image") {
          const imageStyle = {
            left: `${(element.x / badgeWidth) * 100}%`,
            top: `${(element.y / badgeHeight) * 100}%`,
            width: `${(element.width / badgeWidth) * 100}%`,
            height: `${(element.height / badgeHeight) * 100}%`,
            opacity: element.opacity,
            transform: `rotate(${element.rotation}deg)`,
            zIndex: index + 2,
            cursor: interactive
              ? element.locked
                ? "not-allowed"
                : "grab"
              : "default",
          } as CSSProperties;
          const interactionProps = interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                "aria-pressed": isSelected,
                "aria-label": t("imageElement", { name: elementLabel || "" }),
                onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                  event.stopPropagation();
                  if (event.detail === 0) onSelect?.(element.id, false);
                },
                onPointerDown: (
                  event: ReactPointerEvent<HTMLDivElement>,
                ) => {
                  event.currentTarget.focus({ preventScroll: true });
                  onPointerDown?.(event, element);
                },
                onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) =>
                  onKeyMove?.(event, element),
                onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) =>
                  onElementContextMenu?.(event, element),
              }
            : {};

          return (
            <div
              key={element.id}
              className={`badge-image-element ${isSelected ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
              style={imageStyle}
              {...interactionProps}
            >
              <img
                src={element.src}
                alt=""
                draggable={false}
                style={{
                  objectFit:
                    element.fit === "stretch" ? "fill" : element.fit,
                }}
              />
              {interactive && isSelected && selectedElementIds.length === 1 && !element.locked &&
                RESIZE_DIRECTIONS.map((direction) => (
                  <span
                    key={direction}
                    className={`selection-handle handle-${direction}`}
                    onPointerDown={(event) =>
                      onResizePointerDown?.(event, element, direction)
                    }
                    aria-hidden="true"
                  />
                ))}
            </div>
          );
        }

        if (element.type === "shape") {
          const shapeStyle = {
            left: `${(element.x / badgeWidth) * 100}%`,
            top: `${(element.y / badgeHeight) * 100}%`,
            width: `${(element.width / badgeWidth) * 100}%`,
            height: `${(element.height / badgeHeight) * 100}%`,
            opacity: element.opacity,
            transform: `rotate(${element.rotation}deg)`,
            zIndex: index + 2,
            cursor: interactive
              ? element.locked
                ? "not-allowed"
                : "grab"
              : "default",
          } as CSSProperties;
          const visualStyle =
            element.shapeKind === "line"
              ? { background: element.stroke }
              : {
                  background: element.fill,
                  border: `${(Math.max(element.strokeWidth, 0) * 100) / badgeWidth}cqw solid ${element.stroke}`,
                  borderRadius:
                    element.shapeKind === "ellipse"
                      ? "50%"
                      : `${Math.min(
                          50,
                          (element.cornerRadius /
                            Math.max(
                              0.1,
                              Math.min(element.width, element.height),
                            )) *
                            100,
                        )}%`,
                };
          const interactionProps = interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                "aria-pressed": isSelected,
                "aria-label": t("shapeElement", { name: elementLabel }),
                onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                  event.stopPropagation();
                  if (event.detail === 0) onSelect?.(element.id, false);
                },
                onPointerDown: (
                  event: ReactPointerEvent<HTMLDivElement>,
                ) => {
                  event.currentTarget.focus({ preventScroll: true });
                  onPointerDown?.(event, element);
                },
                onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) =>
                  onKeyMove?.(event, element),
                onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) =>
                  onElementContextMenu?.(event, element),
              }
            : {};

          return (
            <div
              key={element.id}
              className={`badge-shape-element ${isSelected ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
              style={shapeStyle}
              {...interactionProps}
            >
              <span className="shape-visual" style={visualStyle} />
              {interactive && isSelected && selectedElementIds.length === 1 && !element.locked &&
                RESIZE_DIRECTIONS.map((direction) => (
                  <span
                    key={direction}
                    className={`selection-handle handle-${direction}`}
                    onPointerDown={(event) =>
                      onResizePointerDown?.(event, element, direction)
                    }
                    aria-hidden="true"
                  />
                ))}
            </div>
          );
        }

        const style = {
          left: `${(element.x / badgeWidth) * 100}%`,
          top: `${(element.y / badgeHeight) * 100}%`,
          width: `${(element.width / badgeWidth) * 100}%`,
          fontSize: `${(element.fontSize * 0.352778 * 100) / badgeWidth}cqw`,
          fontWeight: element.fontWeight,
          fontFamily: getFontFamily(element.fontFamily),
          color: element.color,
          textAlign: element.align,
          opacity: element.opacity,
          transform: `translateY(-50%) rotate(${element.rotation}deg)`,
          zIndex: index + 2,
          cursor: interactive
            ? element.locked
              ? "not-allowed"
              : "grab"
            : "default",
        } as CSSProperties;
        const interactionProps = interactive
          ? {
              role: "button" as const,
              tabIndex: 0,
              "aria-pressed": isSelected,
              "aria-label": t("textElement", { name: elementLabel || "" }),
              onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                event.stopPropagation();
                if (event.detail === 0) onSelect?.(element.id, false);
              },
              onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
                event.currentTarget.focus({ preventScroll: true });
                onPointerDown?.(event, element);
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) =>
                onKeyMove?.(event, element),
              onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) =>
                onElementContextMenu?.(event, element),
            }
          : {};

        return (
          <div
            key={element.id}
            className={`badge-text ${isSelected ? "is-selected" : ""} ${element.locked ? "is-locked" : ""}`}
            style={style}
            {...interactionProps}
          >
            {resolveText(element, row)}
            {interactive && isSelected && selectedElementIds.length === 1 && !element.locked &&
              RESIZE_DIRECTIONS.map((direction) => (
                <span
                  key={direction}
                  className={`selection-handle handle-${direction}`}
                  onPointerDown={(event) =>
                    onResizePointerDown?.(event, element, direction)
                  }
                  aria-hidden="true"
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function PreviewCropMarks({
  badgeWidth,
  badgeHeight,
}: {
  badgeWidth: number;
  badgeHeight: number;
}) {
  const style = {
    "--crop-mark-x": `${(3 / badgeWidth) * 100}%`,
    "--crop-mark-y": `${(3 / badgeHeight) * 100}%`,
    "--crop-offset-x": `${(1 / badgeWidth) * 100}%`,
    "--crop-offset-y": `${(1 / badgeHeight) * 100}%`,
  } as CSSProperties;

  return (
    <span className="preview-crop-marks" style={style} aria-hidden="true">
      <i className="crop-mark top-left-horizontal" />
      <i className="crop-mark top-left-vertical" />
      <i className="crop-mark top-right-horizontal" />
      <i className="crop-mark top-right-vertical" />
      <i className="crop-mark bottom-left-horizontal" />
      <i className="crop-mark bottom-left-vertical" />
      <i className="crop-mark bottom-right-horizontal" />
      <i className="crop-mark bottom-right-vertical" />
    </span>
  );
}

export function BadgeStudio() {
  const { locale, setLocale, t } = useI18n();
  const [view, setView] = useState<AppView>("landing");
  const [mode, setMode] = useState<Mode>("design");
  const [badgeWidth, setBadgeWidth] = useState(95);
  const [badgeHeight, setBadgeHeight] = useState(123);
  const [safeArea, setSafeArea] = useState(5);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [background, setBackground] = useState<string | null>(null);
  const [backgroundName, setBackgroundName] = useState("");
  const [backgroundFit, setBackgroundFit] = useState<BackgroundFit>("cover");
  const [elements, setElements] = useState<CanvasElement[]>(DEFAULT_ELEMENTS);
  const [historyPast, setHistoryPast] = useState<CanvasElement[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<CanvasElement[][]>([]);
  const [selectedElementId, setSelectedElementIdState] = useState<string | null>(
    null,
  );
  const [selectedElementIds, setSelectedElementIdsState] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [rows, setRows] = useState<BadgeRow[]>(SAMPLE_ROWS);
  const [selectedRowId, setSelectedRowId] = useState("row-1");
  const [selectedDataRowIds, setSelectedDataRowIds] = useState<string[]>([]);
  const [draggedDataRowId, setDraggedDataRowId] = useState<string | null>(null);
  const [dataHistoryPast, setDataHistoryPast] = useState<DataHistoryEntry[]>(
    [],
  );
  const [dataHistoryFuture, setDataHistoryFuture] = useState<
    DataHistoryEntry[]
  >([]);
  const [page, setPage] = useState<PageSettings>(DEFAULT_PAGE);
  const [dpi, setDpi] = useState(300);
  const [outputMode, setOutputMode] = useState<OutputMode>("standard");
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [newField, setNewField] = useState("");
  const [newQrValue, setNewQrValue] = useState("");
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [brandCropSession, setBrandCropSession] =
    useState<BrandCropSession | null>(null);
  const [isBrandLogoReading, setIsBrandLogoReading] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] =
    useState<CanvasContextMenu | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    vertical: false,
    horizontal: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedProjects, setSavedProjects] = useState<StoredProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [inspectorSheetState, setInspectorSheetState] =
    useState<InspectorSheetState>("collapsed");
  const [responsiveToolPanel, setResponsiveToolPanel] =
    useState<ResponsiveToolPanel>(null);
  const [inspectorSheetDragOffset, setInspectorSheetDragOffset] = useState(0);
  const [isInspectorSheetDragging, setIsInspectorSheetDragging] =
    useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const qrDialogRef = useRef<HTMLElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const qrLaunchButtonRef = useRef<HTMLButtonElement>(null);
  const brandBarLaunchButtonRef = useRef<HTMLLabelElement>(null);
  const brandCropDialogRef = useRef<HTMLElement>(null);
  const brandCropCloseRef = useRef<HTMLButtonElement>(null);
  const brandCropDragRef = useRef<BrandCropDrag | null>(null);
  const canvasContextMenuRef = useRef<HTMLDivElement>(null);
  const newFieldInputRef = useRef<HTMLInputElement>(null);
  const selectAllRowsRef = useRef<HTMLInputElement>(null);
  const dataRowPointerDragRef = useRef<DataRowPointerDrag | null>(null);
  const guideTimerRef = useRef<number | null>(null);
  const elementsRef = useRef<CanvasElement[]>(DEFAULT_ELEMENTS);
  const fieldsRef = useRef<string[]>(DEFAULT_FIELDS);
  const rowsRef = useRef<BadgeRow[]>(SAMPLE_ROWS);
  const selectedElementIdRef = useRef<string | null>(null);
  const selectedElementIdsRef = useRef<string[]>([]);
  const selectedRowIdRef = useRef("row-1");
  const activeDataCellKeyRef = useRef<string | null>(null);
  const dataCellEditRecordedRef = useRef(false);
  const saveRevisionRef = useRef(0);
  const skipNextAutosaveRef = useRef(false);
  const projectSavePromisesRef = useRef<Map<string, Promise<unknown>>>(
    new Map(),
  );
  const inspectorSheetDragRef = useRef<InspectorSheetDrag | null>(null);
  const suppressInspectorSheetClickRef = useRef(false);

  function setSelection(ids: string[], primaryId?: string | null) {
    const uniqueIds = [...new Set(ids)];
    const nextPrimaryId =
      primaryId && uniqueIds.includes(primaryId)
        ? primaryId
        : uniqueIds.at(-1) || null;
    selectedElementIdsRef.current = uniqueIds;
    selectedElementIdRef.current = nextPrimaryId;
    setSelectedElementIdsState(uniqueIds);
    setSelectedElementIdState(nextPrimaryId);
  }

  function setSelectedElementId(id: string | null) {
    setSelection(id ? [id] : [], id);
  }

  const selectedElements = elements.filter((element) =>
    selectedElementIds.includes(element.id),
  );
  const selectedElement =
    selectedElements.length === 1 ? selectedElements[0] : null;
  const selectedGroupId =
    selectedElements.length > 1 &&
    selectedElements[0]?.groupId &&
    selectedElements.every(
      (element) => element.groupId === selectedElements[0].groupId,
    )
      ? selectedElements[0].groupId
      : undefined;
  const localizedSampleData = useMemo(
    () => getLocalizedSampleData(locale),
    [locale],
  );
  const layout = useMemo(
    () => getPageLayout(page, badgeWidth, badgeHeight),
    [page, badgeWidth, badgeHeight],
  );
  const brandCropPreview = useMemo(() => {
    if (!brandCropSession) return null;
    const activeLogo = brandCropSession.logos[brandCropSession.activeIndex];
    if (!activeLogo) return null;
    const target = brandCropSession.targetElementId
      ? elements.find(
          (element): element is BrandBarElement =>
            element.id === brandCropSession.targetElementId &&
            element.type === "brandBar",
        )
      : undefined;
    let previewElement: BrandBarElement;
    if (target) {
      const logos = brandCropSession.replaceLogoId
        ? target.logos.map((logo) =>
            logo.id === brandCropSession.replaceLogoId
              ? { ...activeLogo, id: logo.id }
              : logo,
          )
        : [...target.logos, ...brandCropSession.logos];
      previewElement = { ...target, logos };
    } else {
      const dimensions = getDefaultBrandBarDimensions(
        brandCropSession.direction,
        badgeWidth,
        badgeHeight,
      );
      previewElement = {
        id: "brand-crop-preview",
        name: "",
        type: "brandBar",
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
        opacity: 1,
        rotation: 0,
        locked: false,
        hidden: false,
        direction: brandCropSession.direction,
        gap: 2,
        padding: 2,
        backgroundColor: brandCropSession.backgroundColor,
        cornerRadius: 2,
        logos: brandCropSession.logos,
      };
    }
    const activeId = brandCropSession.replaceLogoId || activeLogo.id;
    const slot =
      getBrandBarSlots(previewElement).find(
        (candidate) => candidate.logo.id === activeId,
      ) || getBrandBarSlots(previewElement)[0];
    return slot ? { logo: activeLogo, slot } : null;
  }, [brandCropSession, badgeWidth, badgeHeight, elements]);
  const recordsPerPage = outputMode === "table-tent" ? 1 : layout.capacity;
  const pageCount =
    recordsPerPage > 0 ? Math.max(1, Math.ceil(rows.length / recordsPerPage)) : 0;
  const currentPreviewPage = Math.min(
    previewPageIndex,
    Math.max(0, pageCount - 1),
  );
  const previewRows =
    recordsPerPage > 0
      ? rows.slice(
          currentPreviewPage * recordsPerPage,
          (currentPreviewPage + 1) * recordsPerPage,
        )
      : [];

  useEffect(() => {
    setPreviewPageIndex((current) =>
      Math.min(current, Math.max(0, pageCount - 1)),
    );
  }, [pageCount]);

  useEffect(() => {
    let cancelled = false;
    void listProjectDrafts<BadgeProject>()
      .then((projects) => {
        if (!cancelled) setSavedProjects(projects);
      })
      .catch(() => {
        // A blocked browser storage API should not prevent editing.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !activeProject) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const revision = saveRevisionRef.current + 1;
    saveRevisionRef.current = revision;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      const project: BadgeProject = {
        format: PROJECT_FORMAT,
        version: PROJECT_VERSION,
        updatedAt,
        badgeWidth,
        badgeHeight,
        safeArea,
        backgroundColor,
        background,
        backgroundName,
        backgroundFit,
        elements,
        fields,
        rows,
        page,
        dpi,
        outputMode,
      };
      const savePromise = saveProjectDraft({
        ...activeProject,
        name: normalizeProjectName(activeProject.name, t("untitledProject")),
        updatedAt,
        badgeWidth,
        badgeHeight,
        rowCount: rows.length,
        outputMode,
        value: project,
      });
      projectSavePromisesRef.current.set(activeProject.id, savePromise);
      void savePromise
        .then(({ summary }) => {
          if (saveRevisionRef.current !== revision) return;
          setSavedProjects((current) =>
            [summary, ...current.filter((item) => item.id !== summary.id)].sort(
              (a, b) => b.updatedAt.localeCompare(a.updatedAt),
            ),
          );
          setSaveStatus("saved");
        })
        .catch(() => {
          if (saveRevisionRef.current !== revision) return;
          setSaveStatus("error");
        })
        .finally(() => {
          if (projectSavePromisesRef.current.get(activeProject.id) === savePromise) {
            projectSavePromisesRef.current.delete(activeProject.id);
          }
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    badgeWidth,
    badgeHeight,
    safeArea,
    backgroundColor,
    background,
    backgroundName,
    elements,
    fields,
    rows,
    page,
    backgroundFit,
    dpi,
    outputMode,
    activeProject,
    t,
  ]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isQrDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsQrDialogOpen(false);
        window.requestAnimationFrame(() => qrLaunchButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        qrDialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        ) || [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusFrame = window.requestAnimationFrame(() =>
      qrInputRef.current?.focus(),
    );
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isQrDialogOpen]);

  useEffect(() => {
    if (!brandCropSession) return;
    const returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() =>
      brandCropCloseRef.current?.focus(),
    );
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setBrandCropSession(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        brandCropDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKey);
      window.requestAnimationFrame(() => returnFocusTarget?.focus());
    };
  }, [brandCropSession]);

  useEffect(() => {
    if (!canvasContextMenu) return;
    const closeMenu = () => setCanvasContextMenu(null);
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".canvas-context-menu")
      ) {
        return;
      }
      closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const focusFrame = window.requestAnimationFrame(() =>
      canvasContextMenuRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true }),
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [canvasContextMenu]);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    const rowIds = new Set(rows.map((row) => row.id));
    setSelectedDataRowIds((current) =>
      current.filter((rowId) => rowIds.has(rowId)),
    );
  }, [rows]);

  useEffect(() => {
    if (!selectAllRowsRef.current) return;
    selectAllRowsRef.current.indeterminate =
      selectedDataRowIds.length > 0 &&
      selectedDataRowIds.length < rows.length;
  }, [rows.length, selectedDataRowIds.length]);

  useEffect(() => {
    selectedElementIdRef.current = selectedElementId;
  }, [selectedElementId]);

  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  useEffect(() => {
    if (mode !== "print") setIsPrintSettingsOpen(false);
  }, [mode]);

  useEffect(() => {
    if (!isPrintSettingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPrintSettingsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isPrintSettingsOpen]);

  useEffect(() => {
    if (!selectedElementIds.length) return;
    setResponsiveToolPanel(null);
    setInspectorSheetState((current) =>
      current === "collapsed" ? "half" : current,
    );
  }, [selectedElementIds]);

  useEffect(() => {
    selectedRowIdRef.current = selectedRowId;
  }, [selectedRowId]);

  useEffect(
    () => () => {
      if (guideTimerRef.current) window.clearTimeout(guideTimerRef.current);
    },
    [],
  );

  function rememberElements() {
    const snapshot = cloneElements(elementsRef.current);
    setHistoryPast((current) => [...current.slice(-39), snapshot]);
    setHistoryFuture([]);
  }

  function mutateElements(
    updater: (current: CanvasElement[]) => CanvasElement[],
    recordHistory = true,
  ) {
    if (recordHistory) rememberElements();
    setElements((current) => {
      const next = updater(current);
      elementsRef.current = next;
      return next;
    });
  }

  function updateElement(
    id: string,
    patch:
      | Partial<TextElement>
      | Partial<ImageElement>
      | Partial<ShapeElement>
      | Partial<BrandBarElement>,
    recordHistory = true,
  ) {
    mutateElements(
      (current) =>
        current.map((element) =>
          element.id === id
            ? ({ ...element, ...patch } as CanvasElement)
            : element,
        ),
      recordHistory,
    );
  }

  const captureDataHistoryEntry = useCallback(
    (includesElements = false): DataHistoryEntry => ({
      includesElements,
      snapshot: {
        fields: [...fieldsRef.current],
        rows: cloneRows(rowsRef.current),
        selectedRowId: selectedRowIdRef.current,
        ...(includesElements
          ? {
              elements: cloneElements(elementsRef.current),
              selectedElementId: selectedElementIdRef.current,
            }
          : {}),
      },
    }),
    [],
  );

  const restoreDataHistoryEntry = useCallback((entry: DataHistoryEntry) => {
    const nextFields = [...entry.snapshot.fields];
    const nextRows = cloneRows(entry.snapshot.rows);
    const nextSelectedRowId = nextRows.some(
      (row) => row.id === entry.snapshot.selectedRowId,
    )
      ? entry.snapshot.selectedRowId
      : nextRows[0]?.id || "";
    fieldsRef.current = nextFields;
    rowsRef.current = nextRows;
    selectedRowIdRef.current = nextSelectedRowId;
    setFields(nextFields);
    setRows(nextRows);
    setSelectedRowId(nextSelectedRowId);
    if (entry.includesElements && entry.snapshot.elements) {
      const nextElements = cloneElements(entry.snapshot.elements);
      const nextSelectedId = entry.snapshot.selectedElementId ?? null;
      elementsRef.current = nextElements;
      selectedElementIdRef.current = nextSelectedId;
      selectedElementIdsRef.current = nextSelectedId ? [nextSelectedId] : [];
      setElements(nextElements);
      setSelectedElementIdState(nextSelectedId);
      setSelectedElementIdsState(nextSelectedId ? [nextSelectedId] : []);
    }
  }, []);

  function rememberData(includesElements = false) {
    const snapshot = captureDataHistoryEntry(includesElements);
    setDataHistoryPast((current) => [...current.slice(-29), snapshot]);
    setDataHistoryFuture([]);
  }

  function resetDataHistory() {
    setDataHistoryPast([]);
    setDataHistoryFuture([]);
    setSelectedDataRowIds([]);
    setDraggedDataRowId(null);
    dataRowPointerDragRef.current = null;
    activeDataCellKeyRef.current = null;
    dataCellEditRecordedRef.current = false;
  }

  const undoElements = useCallback(() => {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    const restored = cloneElements(previous);
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [
      cloneElements(elementsRef.current),
      ...current.slice(0, 39),
    ]);
    elementsRef.current = restored;
    setElements(restored);
    const nextSelectedId = restored.some(
      (element) => element.id === selectedElementIdRef.current,
    )
      ? selectedElementIdRef.current
      : null;
    selectedElementIdRef.current = nextSelectedId;
    selectedElementIdsRef.current = nextSelectedId ? [nextSelectedId] : [];
    setSelectedElementIdState(nextSelectedId);
    setSelectedElementIdsState(nextSelectedId ? [nextSelectedId] : []);
  }, [historyPast]);

  const redoElements = useCallback(() => {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    const restored = cloneElements(next);
    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [
      ...current.slice(-39),
      cloneElements(elementsRef.current),
    ]);
    elementsRef.current = restored;
    setElements(restored);
  }, [historyFuture]);

  const undoData = useCallback(() => {
    if (!dataHistoryPast.length) return;
    const previous = dataHistoryPast[dataHistoryPast.length - 1];
    setDataHistoryPast((current) => current.slice(0, -1));
    setDataHistoryFuture((current) => [
      captureDataHistoryEntry(previous.includesElements),
      ...current.slice(0, 29),
    ]);
    restoreDataHistoryEntry(previous);
    dataCellEditRecordedRef.current = false;
  }, [
    captureDataHistoryEntry,
    dataHistoryPast,
    restoreDataHistoryEntry,
  ]);

  const redoData = useCallback(() => {
    if (!dataHistoryFuture.length) return;
    const next = dataHistoryFuture[0];
    setDataHistoryFuture((current) => current.slice(1));
    setDataHistoryPast((current) => [
      ...current.slice(-29),
      captureDataHistoryEntry(next.includesElements),
    ]);
    restoreDataHistoryEntry(next);
    dataCellEditRecordedRef.current = false;
  }, [
    captureDataHistoryEntry,
    dataHistoryFuture,
    restoreDataHistoryEntry,
  ]);

  const deleteSelectedFromShortcut = useCallback(() => {
    const ids = selectedElementIdsRef.current;
    if (!ids.length) return;
    const deletableIds = new Set(
      elementsRef.current
        .filter((element) => ids.includes(element.id) && !element.locked)
        .map((element) => element.id),
    );
    if (!deletableIds.size) return;
    const snapshot = cloneElements(elementsRef.current);
    const next = elementsRef.current.filter(
      (element) => !deletableIds.has(element.id),
    );
    setHistoryPast((current) => [...current.slice(-39), snapshot]);
    setHistoryFuture([]);
    elementsRef.current = next;
    selectedElementIdsRef.current = [];
    selectedElementIdRef.current = null;
    setElements(next);
    setSelectedElementIdsState([]);
    setSelectedElementIdState(null);
  }, []);

  function snapInspectorSheet(next: InspectorSheetState) {
    setInspectorSheetState(next);
    setInspectorSheetDragOffset(0);
  }

  function openResponsiveToolPanel(panel: Exclude<ResponsiveToolPanel, null>) {
    setSelection([]);
    snapInspectorSheet("collapsed");
    setResponsiveToolPanel((current) => (current === panel ? null : panel));
  }

  function openResponsiveLayerPanel() {
    setResponsiveToolPanel(null);
    setSelection([]);
    snapInspectorSheet("half");
  }

  function moveInspectorSheet(direction: "up" | "down") {
    const currentIndex = inspectorSheetStates.indexOf(inspectorSheetState);
    const nextIndex = clamp(
      currentIndex + (direction === "up" ? 1 : -1),
      0,
      inspectorSheetStates.length - 1,
    );
    snapInspectorSheet(inspectorSheetStates[nextIndex]);
  }

  function handleInspectorSheetPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    inspectorSheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      moved: false,
    };
    suppressInspectorSheetClickRef.current = false;
    setIsInspectorSheetDragging(true);
    setInspectorSheetDragOffset(0);
  }

  function handleInspectorSheetPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const current = inspectorSheetDragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const delta = event.clientY - current.startY;
    current.lastY = event.clientY;
    current.moved = current.moved || Math.abs(delta) > 6;
    const viewportHeight = window.innerHeight;
    const minimumOffset =
      inspectorSheetState === "expanded" ? -12 : -viewportHeight * 0.62;
    const maximumOffset =
      inspectorSheetState === "collapsed" ? 12 : viewportHeight * 0.62;
    setInspectorSheetDragOffset(
      clamp(delta, minimumOffset, maximumOffset),
    );
  }

  function handleInspectorSheetPointerEnd(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const current = inspectorSheetDragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const delta = current.lastY - current.startY;
    const snapThreshold = Math.min(84, window.innerHeight * 0.1);
    suppressInspectorSheetClickRef.current = current.moved;
    inspectorSheetDragRef.current = null;
    setIsInspectorSheetDragging(false);
    if (Math.abs(delta) >= snapThreshold) {
      const currentIndex = inspectorSheetStates.indexOf(inspectorSheetState);
      const stepCount = Math.abs(delta) >= snapThreshold * 2.4 ? 2 : 1;
      const nextIndex = clamp(
        currentIndex + (delta < 0 ? stepCount : -stepCount),
        0,
        inspectorSheetStates.length - 1,
      );
      snapInspectorSheet(inspectorSheetStates[nextIndex]);
    } else {
      setInspectorSheetDragOffset(0);
    }
  }

  function cancelInspectorSheetPointer(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (inspectorSheetDragRef.current?.pointerId !== event.pointerId) return;
    inspectorSheetDragRef.current = null;
    suppressInspectorSheetClickRef.current = true;
    setIsInspectorSheetDragging(false);
    setInspectorSheetDragOffset(0);
  }

  function toggleInspectorSheet() {
    if (suppressInspectorSheetClickRef.current) {
      suppressInspectorSheetClickRef.current = false;
      return;
    }
    snapInspectorSheet(
      inspectorSheetState === "collapsed" ? "half" : "collapsed",
    );
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z";
      const isRedo =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "y";

      if (mode === "data") {
        if (isUndo) {
          event.preventDefault();
          if (event.shiftKey) redoData();
          else undoData();
        } else if (isRedo) {
          event.preventDefault();
          redoData();
        }
        return;
      }

      if (
        mode !== "design" ||
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (isUndo) {
        event.preventDefault();
        if (event.shiftKey) redoElements();
        else undoElements();
      }
      if (isRedo) {
        event.preventDefault();
        redoElements();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const hasDeletableSelection = elementsRef.current.some(
          (element) =>
            selectedElementIdsRef.current.includes(element.id) &&
            !element.locked,
        );
        if (!hasDeletableSelection) return;
        event.preventDefault();
        deleteSelectedFromShortcut();
        return;
      }
      if (event.key === "Escape") {
        if (document.querySelector(".canvas-context-menu")) return;
        if (responsiveToolPanel) {
          setResponsiveToolPanel(null);
          return;
        }
        if (
          inspectorSheetState !== "collapsed" &&
          window.matchMedia("(max-width: 980px)").matches
        ) {
          setInspectorSheetState("collapsed");
          setInspectorSheetDragOffset(0);
          return;
        }
        selectedElementIdRef.current = null;
        selectedElementIdsRef.current = [];
        setSelectedElementIdState(null);
        setSelectedElementIdsState([]);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    deleteSelectedFromShortcut,
    inspectorSheetState,
    mode,
    responsiveToolPanel,
    redoData,
    redoElements,
    undoData,
    undoElements,
  ]);

  function applyProject(project: BadgeProject) {
    setBadgeWidth(project.badgeWidth);
    setBadgeHeight(project.badgeHeight);
    setSafeArea(project.safeArea);
    setBackgroundColor(project.backgroundColor);
    setBackground(project.background);
    setBackgroundName(project.backgroundName);
    setBackgroundFit(project.backgroundFit);
    setElements(project.elements);
    elementsRef.current = project.elements;
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedElementId(null);
    snapInspectorSheet("collapsed");
    setFields(project.fields);
    setRows(project.rows);
    setSelectedRowId(project.rows[0]?.id || "");
    resetDataHistory();
    setPage(project.page);
    setDpi(project.dpi);
    setOutputMode(project.outputMode);
  }

  async function openSavedProject(projectId: string) {
    try {
      const stored = await loadProjectDraft<unknown>(projectId);
      if (!stored) return false;
      const project = normalizeProject(stored.value);
      if (!project) return false;
      skipNextAutosaveRef.current = true;
      setActiveProject({
        id: stored.id,
        name: stored.name,
        createdAt: stored.createdAt,
      });
      applyProject(project);
      setMode("design");
      setView("studio");
      setSaveStatus("saved");
      return true;
    } catch {
      return false;
    }
  }

  async function removeSavedProject(projectId: string) {
    if (activeProject?.id === projectId) {
      saveRevisionRef.current += 1;
      setActiveProject(null);
      setSaveStatus("idle");
    }
    await projectSavePromisesRef.current.get(projectId)?.catch(() => undefined);
    await deleteProjectDraft(projectId);
    setSavedProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
  }

  async function renameSavedProject(projectId: string, nextName: string) {
    try {
      await projectSavePromisesRef.current
        .get(projectId)
        ?.catch(() => undefined);
      const stored = await loadProjectDraft<BadgeProject>(projectId);
      if (!stored) return false;
      const name = normalizeProjectName(nextName, stored.name);
      const updatedAt = new Date().toISOString();
      const { summary } = await saveProjectDraft({
        ...stored,
        name,
        updatedAt,
        value: {
          ...stored.value,
          updatedAt,
        },
      });
      setSavedProjects((current) =>
        [summary, ...current.filter((project) => project.id !== projectId)].sort(
          (a, b) => b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
      setActiveProject((current) =>
        current?.id === projectId ? { ...current, name } : current,
      );
      return true;
    } catch {
      return false;
    }
  }

  function startWithPreset(
    preset: BadgePreset,
    projectName = t(preset.nameKey),
  ) {
    const createdAt = new Date().toISOString();
    const nextOutputMode = preset.outputMode ?? "standard";
    const sampleData = localizedSampleData;
    const presetElements =
      nextOutputMode === "table-tent"
        ? createTableTentElements(sampleData.fields, t)
        : createPresetElements(
            preset.width,
            preset.height,
            sampleData.fields,
            t,
          );
    setBadgeWidth(preset.width);
    setBadgeHeight(preset.height);
    setSafeArea(nextOutputMode === "table-tent" ? 8 : preset.width > preset.height ? 3 : 5);
    setBackgroundColor("#ffffff");
    setBackground(null);
    setBackgroundName("");
    setBackgroundFit("cover");
    setElements(presetElements);
    elementsRef.current = presetElements;
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedElementId(null);
    snapInspectorSheet("collapsed");
    setFields(sampleData.fields);
    setRows(sampleData.rows);
    setSelectedRowId("row-1");
    resetDataHistory();
    setPage(
      nextOutputMode === "table-tent"
        ? { ...TABLE_TENT_PAGE }
        : { ...DEFAULT_PAGE },
    );
    setDpi(300);
    setOutputMode(nextOutputMode);
    setMode("design");
    setActiveProject({
      id: makeId("project"),
      name: projectName,
      createdAt,
    });
    setView("studio");
    setToast(
      t("toastPreset", {
        name: t(preset.nameKey),
        width: displayNumber(preset.width),
        height: displayNumber(preset.height),
      }),
    );
  }

  function startCustomSize() {
    startWithPreset(BADGE_PRESETS[0], t("customProjectName"));
    setToast(t("toastCustom"));
  }

  function closeQrDialog() {
    setIsQrDialogOpen(false);
    window.requestAnimationFrame(() => qrLaunchButtonRef.current?.focus());
  }

  function canAddElement() {
    if (elementsRef.current.length < MAX_ELEMENTS) return true;
    setToast(t("errorProjectElements", { count: MAX_ELEMENTS }));
    return false;
  }

  function addVariableElement(field: string) {
    if (!canAddElement()) return;
    const element: TextElement = {
      id: makeId("element"),
      name: `${field} ${t("textElements")}`,
      type: "text",
      kind: "variable",
      field,
      x: 10,
      y: clamp(30 + elements.length * 8, 12, badgeHeight - 12),
      width: Math.max(20, badgeWidth - 20),
      fontSize: field === fields[0] ? 22 : 12,
      fontWeight: field === fields[0] ? 700 : 500,
      fontFamily: "sans",
      color: "#17201f",
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    };
    mutateElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  }

  function addStaticElement(preset: "heading" | "body" | "caption" = "body") {
    if (!canAddElement()) return;
    const settings = {
      heading: {
        name: t("headingText"),
        value: t("headingTextDefault"),
        fontSize: 24,
        fontWeight: 800,
        color: "#17201f",
      },
      body: {
        name: t("bodyText"),
        value: t("bodyTextDefault"),
        fontSize: 12,
        fontWeight: 500,
        color: "#334155",
      },
      caption: {
        name: t("captionText"),
        value: t("captionTextDefault"),
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
      },
    }[preset];
    const element: TextElement = {
      id: makeId("element"),
      name: settings.name,
      type: "text",
      kind: "static",
      value: settings.value,
      x: 10,
      y: clamp(28 + (elements.length % 8) * 9, 10, badgeHeight - 10),
      width: Math.max(20, badgeWidth - 20),
      fontSize: settings.fontSize,
      fontWeight: settings.fontWeight,
      fontFamily: "sans",
      color: settings.color,
      align: "center",
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    };
    mutateElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  }

  function addShapeElement(shapeKind: ShapeKind) {
    if (!canAddElement()) return;
    const isLine = shapeKind === "line";
    const width = Math.min(isLine ? 48 : 32, badgeWidth * 0.55);
    const height = Math.min(
      isLine ? 1.5 : shapeKind === "ellipse" ? 24 : 20,
      badgeHeight * 0.3,
    );
    const element: ShapeElement = {
      id: makeId("shape"),
      name:
        shapeKind === "rectangle"
          ? t("rectangle")
          : shapeKind === "ellipse"
            ? t("ellipse")
            : t("line"),
      type: "shape",
      shapeKind,
      x: Math.round(((badgeWidth - width) / 2) * 10) / 10,
      y: Math.round(((badgeHeight - height) / 2) * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      fill: "#dbeafe",
      stroke: "#2563eb",
      strokeWidth: isLine ? 0 : 0.8,
      cornerRadius: shapeKind === "rectangle" ? 2 : 0,
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    };
    mutateElements((current) => [...current, element]);
    setSelectedElementId(element.id);
    setToast(t("toastShapeAdded", { name: element.name }));
  }

  async function makeQrDataUrl(value: string) {
    return QRCode.toDataURL(value, {
      width: 1024,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#ffffff" },
    });
  }

  async function addQrElement() {
    if (!canAddElement()) return;
    const value = newQrValue.trim();
    if (!value) {
      setToast(t("qrValueRequired"));
      return;
    }
    try {
      const src = await makeQrDataUrl(value);
      const width = Math.min(30, badgeWidth * 0.34, badgeHeight * 0.34);
      const element: ImageElement = {
        id: makeId("qr"),
        name: t("qrCode"),
        type: "image",
        sourceKind: "qr",
        qrValue: value,
        src,
        mimeType: "image/png",
        x: Math.round(((badgeWidth - width) / 2) * 10) / 10,
        y: Math.round(((badgeHeight - width) / 2) * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(width * 10) / 10,
        fit: "contain",
        aspectRatio: 1,
        opacity: 1,
        rotation: 0,
        locked: false,
        hidden: false,
      };
      mutateElements((current) => [...current, element]);
      setSelectedElementId(element.id);
      setNewQrValue("");
      closeQrDialog();
      setToast(t("toastQrAdded"));
    } catch {
      setToast(t("toastQrFailed"));
    }
  }

  async function regenerateQrElement(id: string, nextValue: string) {
    const value = nextValue.trim();
    if (!value) {
      setToast(t("qrValueRequired"));
      return;
    }
    try {
      const src = await makeQrDataUrl(value);
      updateElement(id, { qrValue: value, src }, false);
      setToast(t("toastQrUpdated"));
    } catch {
      setToast(t("toastQrFailed"));
    }
  }

  function getSelectionTargets(element: CanvasElement) {
    return element.groupId
      ? elementsRef.current
          .filter((item) => item.groupId === element.groupId)
          .map((item) => item.id)
      : [element.id];
  }

  function selectCanvasElement(element: CanvasElement, additive = false) {
    const targets = getSelectionTargets(element);
    const current = selectedElementIdsRef.current;
    let next: string[];
    if (additive) {
      const allSelected = targets.every((id) => current.includes(id));
      next = allSelected
        ? current.filter((id) => !targets.includes(id))
        : [...new Set([...current, ...targets])];
    } else if (current.length > 1 && targets.every((id) => current.includes(id))) {
      next = current;
    } else {
      next = targets;
    }
    setSelection(next, next.includes(element.id) ? element.id : next.at(-1));
    return next;
  }

  function groupElements(targetIds = selectedElementIdsRef.current) {
    const ids = [...new Set(targetIds)];
    if (ids.length < 2) return;
    const groupId = makeId("group");
    mutateElements((current) =>
      current.map((element) =>
        ids.includes(element.id) ? { ...element, groupId } : element,
      ),
    );
    setSelection(ids, ids.at(-1));
    setCanvasContextMenu(null);
  }

  function ungroupElements(groupId?: string) {
    const groupIds = new Set(
      groupId
        ? [groupId]
        : elementsRef.current
            .filter((element) =>
              selectedElementIdsRef.current.includes(element.id),
            )
            .flatMap((element) => (element.groupId ? [element.groupId] : [])),
    );
    if (!groupIds.size) return;
    mutateElements((current) =>
      current.map((element) =>
        element.groupId && groupIds.has(element.groupId)
          ? { ...element, groupId: undefined }
          : element,
      ),
    );
    setCanvasContextMenu(null);
  }

  function handleElementContextMenu(
    event: ReactMouseEvent<HTMLDivElement>,
    element: CanvasElement,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const targets = getSelectionTargets(element);
    const current = selectedElementIdsRef.current;
    const targetIds = current.includes(element.id) ? current : targets;
    if (!current.includes(element.id)) setSelection(targetIds, element.id);
    setCanvasContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 184),
      y: Math.min(event.clientY, window.innerHeight - 176),
      targetIds,
      groupId: element.groupId,
    });
  }

  function duplicateSelected() {
    if (!selectedElement) return;
    if (!canAddElement()) return;
    const duplicate = {
      ...(selectedElement.type === "brandBar"
        ? {
            ...selectedElement,
            logos: selectedElement.logos.map((logo) => ({
              ...logo,
              id: makeId("brand-logo"),
            })),
          }
        : selectedElement),
      id: makeId("element"),
      name: `${getElementLabel(selectedElement, t)} ${t("duplicate")}`,
      x: selectedElement.x + 3,
      y: selectedElement.y + 3,
      groupId: undefined,
      locked: false,
    } as CanvasElement;
    const duplicateBounds = getElementMoveBounds(
      duplicate,
      badgeWidth,
      badgeHeight,
    );
    duplicate.x = clamp(duplicate.x, duplicateBounds.minX, duplicateBounds.maxX);
    duplicate.y = clamp(duplicate.y, duplicateBounds.minY, duplicateBounds.maxY);
    mutateElements((current) => [...current, duplicate]);
    setSelectedElementId(duplicate.id);
    setCanvasContextMenu(null);
  }

  function deleteSelected() {
    deleteSelectedFromShortcut();
    setCanvasContextMenu(null);
  }

  function flashGuides(guides: SnapGuides) {
    if (guideTimerRef.current) window.clearTimeout(guideTimerRef.current);
    setSnapGuides(guides);
    guideTimerRef.current = window.setTimeout(
      () => setSnapGuides({ vertical: false, horizontal: false }),
      650,
    );
  }

  function alignSelectedToCenter(axis: "horizontal" | "vertical") {
    if (!selectedElement) return;
    if (axis === "horizontal") {
      updateElement(selectedElement.id, {
        x: Math.round(((badgeWidth - selectedElement.width) / 2) * 10) / 10,
      });
      flashGuides({ vertical: true, horizontal: false });
      return;
    }
    updateElement(selectedElement.id, {
      y:
        selectedElement.type !== "text"
          ? Math.round(((badgeHeight - selectedElement.height) / 2) * 10) / 10
          : Math.round((badgeHeight / 2) * 10) / 10,
    });
    flashGuides({ vertical: false, horizontal: true });
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    element: CanvasElement,
  ) {
    if (!stageRef.current) return;
    event.stopPropagation();
    if (event.button !== 0) return;
    event.preventDefault();
    setCanvasContextMenu(null);
    const nextSelection = selectCanvasElement(
      element,
      event.metaKey || event.ctrlKey || event.shiftKey,
    );
    if (element.locked) return;
    if (
      element.groupId &&
      elementsRef.current.some(
        (item) =>
          nextSelection.includes(item.id) &&
          item.groupId === element.groupId &&
          item.locked,
      )
    ) {
      return;
    }
    const draggableIds = nextSelection.filter((id) => {
      const item = elementsRef.current.find((candidate) => candidate.id === id);
      return item && !item.locked;
    });
    if (!draggableIds.includes(element.id)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    rememberElements();
    if (guideTimerRef.current) window.clearTimeout(guideTimerRef.current);
    setSnapGuides({ vertical: false, horizontal: false });
    setResize(null);
    setDrag({
      anchorId: element.id,
      ids: draggableIds,
      pointerX: event.clientX,
      pointerY: event.clientY,
      origins: Object.fromEntries(
        elementsRef.current
          .filter((item) => draggableIds.includes(item.id))
          .map((item) => [item.id, { x: item.x, y: item.y }]),
      ),
    });
  }

  function handleResizePointerDown(
    event: ReactPointerEvent<HTMLSpanElement>,
    element: CanvasElement,
    direction: ResizeDirection,
  ) {
    if (!stageRef.current || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.parentElement?.focus({ preventScroll: true });
    setSelectedElementId(element.id);
    rememberElements();
    setDrag(null);
    setSnapGuides({ vertical: false, horizontal: false });
    setResize({
      id: element.id,
      direction,
      pointerX: event.clientX,
      pointerY: event.clientY,
      elementX: element.x,
      elementY: element.y,
      elementWidth: element.width,
      ...(element.type !== "text"
        ? {
            elementHeight: element.height,
            ...(element.type === "image"
              ? { aspectRatio: element.aspectRatio }
              : {}),
          }
        : {}),
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (resize) {
      const element = elements.find((item) => item.id === resize.id);
      if (!element) return;
      const deltaX =
        ((event.clientX - resize.pointerX) / rect.width) * badgeWidth;
      const deltaY =
        ((event.clientY - resize.pointerY) / rect.height) * badgeHeight;
      const isWest = resize.direction.includes("w");
      const isNorth = resize.direction.includes("n");

      if (
        element.type === "image" &&
        resize.elementHeight !== undefined &&
        resize.aspectRatio
      ) {
        const horizontalDelta = isWest ? -deltaX : deltaX;
        const verticalDelta = (isNorth ? -deltaY : deltaY) * resize.aspectRatio;
        const sizeDelta =
          Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
            ? horizontalDelta
            : verticalDelta;
        const anchorX = isWest
          ? resize.elementX + resize.elementWidth
          : resize.elementX;
        const anchorY = isNorth
          ? resize.elementY + resize.elementHeight
          : resize.elementY;
        const maximumWidth = Math.max(
          0.5,
          Math.min(
            badgeWidth * 2,
            badgeHeight * 2 * resize.aspectRatio,
          ),
        );
        const minimumWidth = Math.min(5, maximumWidth);
        const width =
          Math.round(
            clamp(
              resize.elementWidth + sizeDelta,
              minimumWidth,
              maximumWidth,
            ) * 10,
          ) / 10;
        const height = Math.round((width / resize.aspectRatio) * 10) / 10;
        updateElement(
          resize.id,
          {
            x: Math.round((isWest ? anchorX - width : anchorX) * 10) / 10,
            y: Math.round((isNorth ? anchorY - height : anchorY) * 10) / 10,
            width,
            height,
          },
          false,
        );
      } else if (
        (element.type === "shape" || element.type === "brandBar") &&
        resize.elementHeight !== undefined
      ) {
        const anchorX = isWest
          ? resize.elementX + resize.elementWidth
          : resize.elementX;
        const anchorY = isNorth
          ? resize.elementY + resize.elementHeight
          : resize.elementY;
        const maximumWidth = Math.max(
          0.5,
          badgeWidth * 2,
        );
        const maximumHeight = Math.max(
          0.5,
          badgeHeight * 2,
        );
        const minimumWidth = Math.min(5, maximumWidth);
        const minimumHeight = Math.min(
          element.type === "shape" && element.shapeKind === "line" ? 0.5 : 5,
          maximumHeight,
        );
        const width =
          Math.round(
            clamp(
              resize.elementWidth + (isWest ? -deltaX : deltaX),
              minimumWidth,
              maximumWidth,
            ) * 10,
          ) / 10;
        const height =
          Math.round(
            clamp(
              resize.elementHeight + (isNorth ? -deltaY : deltaY),
              minimumHeight,
              maximumHeight,
            ) * 10,
          ) / 10;
        updateElement(
          resize.id,
          {
            x: Math.round((isWest ? anchorX - width : anchorX) * 10) / 10,
            y: Math.round((isNorth ? anchorY - height : anchorY) * 10) / 10,
            width,
            height,
          },
          false,
        );
      } else {
        const anchorX = isWest
          ? resize.elementX + resize.elementWidth
          : resize.elementX;
        const maximumWidth = Math.max(
          0.5,
          badgeWidth * 2,
        );
        const minimumWidth = Math.min(5, maximumWidth);
        const width =
          Math.round(
            clamp(
              resize.elementWidth + (isWest ? -deltaX : deltaX),
              minimumWidth,
              maximumWidth,
            ) * 10,
          ) / 10;
        updateElement(
          resize.id,
          {
            x: Math.round((isWest ? anchorX - width : anchorX) * 10) / 10,
            width,
          },
          false,
        );
      }
      return;
    }

    if (!drag) return;
    const draggedElements = elements.filter((item) => drag.ids.includes(item.id));
    const anchor = draggedElements.find((item) => item.id === drag.anchorId);
    const anchorOrigin = drag.origins[drag.anchorId];
    if (!anchor || !anchorOrigin || !draggedElements.length) return;
    const rawDeltaX =
      ((event.clientX - drag.pointerX) / rect.width) * badgeWidth;
    const rawDeltaY =
      ((event.clientY - drag.pointerY) / rect.height) * badgeHeight;
    const deltaLimits = draggedElements.reduce(
      (limits, element) => {
        const origin = drag.origins[element.id];
        if (!origin) return limits;
        const bounds = getElementMoveBounds(element, badgeWidth, badgeHeight);
        return {
          minX: Math.max(limits.minX, bounds.minX - origin.x),
          maxX: Math.min(limits.maxX, bounds.maxX - origin.x),
          minY: Math.max(limits.minY, bounds.minY - origin.y),
          maxY: Math.min(limits.maxY, bounds.maxY - origin.y),
        };
      },
      {
        minX: Number.NEGATIVE_INFINITY,
        maxX: Number.POSITIVE_INFINITY,
        minY: Number.NEGATIVE_INFINITY,
        maxY: Number.POSITIVE_INFINITY,
      },
    );
    let nextDeltaX = clamp(rawDeltaX, deltaLimits.minX, deltaLimits.maxX);
    let nextDeltaY = clamp(rawDeltaY, deltaLimits.minY, deltaLimits.maxY);
    const snapThresholdX = (10 / rect.width) * badgeWidth;
    const snapThresholdY = (10 / rect.height) * badgeHeight;
    const originSelectionRect = getSelectionRect(
      draggedElements.map((element) => ({
        ...element,
        x: drag.origins[element.id]?.x ?? element.x,
        y: drag.origins[element.id]?.y ?? element.y,
      })),
    );
    if (!originSelectionRect) return;
    const center = {
      x:
        (originSelectionRect.left + originSelectionRect.right) / 2 +
        nextDeltaX,
      y:
        (originSelectionRect.top + originSelectionRect.bottom) / 2 +
        nextDeltaY,
    };
    const snapsToVerticalCenter =
      Math.abs(center.x - badgeWidth / 2) <= snapThresholdX;
    const snapsToHorizontalCenter =
      Math.abs(center.y - badgeHeight / 2) <= snapThresholdY;

    if (snapsToVerticalCenter) {
      nextDeltaX += badgeWidth / 2 - center.x;
    }
    if (snapsToHorizontalCenter) {
      nextDeltaY += badgeHeight / 2 - center.y;
    }
    nextDeltaX = clamp(nextDeltaX, deltaLimits.minX, deltaLimits.maxX);
    nextDeltaY = clamp(nextDeltaY, deltaLimits.minY, deltaLimits.maxY);

    setSnapGuides({
      vertical: snapsToVerticalCenter,
      horizontal: snapsToHorizontalCenter,
    });
    mutateElements(
      (current) =>
        current.map((element) => {
          const origin = drag.origins[element.id];
          if (!origin || !drag.ids.includes(element.id)) return element;
          return {
            ...element,
            x: Math.round((origin.x + nextDeltaX) * 10) / 10,
            y: Math.round((origin.y + nextDeltaY) * 10) / 10,
          };
        }),
      false,
    );
  }

  function handlePointerEnd() {
    setDrag(null);
    setResize(null);
    setSnapGuides({ vertical: false, horizontal: false });
  }

  function handleKeyMove(
    event: React.KeyboardEvent<HTMLDivElement>,
    element: CanvasElement,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCanvasElement(element, event.metaKey || event.ctrlKey || event.shiftKey);
      return;
    }
    if (element.locked) return;
    const amount = event.shiftKey ? 2 : 0.5;
    const keyMap: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
      ArrowDown: { x: 0, y: amount },
    };
    if (keyMap[event.key]) {
      event.preventDefault();
      const movingIds = selectedElementIdsRef.current.includes(element.id)
        ? selectedElementIdsRef.current
        : getSelectionTargets(element);
      if (
        element.groupId &&
        elementsRef.current.some(
          (item) =>
            movingIds.includes(item.id) &&
            item.groupId === element.groupId &&
            item.locked,
        )
      ) {
        return;
      }
      rememberElements();
      mutateElements(
        (current) =>
          current.map((item) => {
            if (!movingIds.includes(item.id) || item.locked) return item;
            const bounds = getElementMoveBounds(item, badgeWidth, badgeHeight);
            return {
              ...item,
              x: clamp(
                item.x + keyMap[event.key].x,
                bounds.minX,
                bounds.maxX,
              ),
              y: clamp(
                item.y + keyMap[event.key].y,
                bounds.minY,
                bounds.maxY,
              ),
            };
          }),
        false,
      );
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedFromShortcut();
    }
  }

  async function handleBackground(file: File | undefined) {
    if (!file) return;
    try {
      const asset = await readImageAsset(file);
      setBackground(asset.src);
      setBackgroundName(file.name);
      setToast(t("toastBackground"));
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : t("toastBackgroundFailed"),
      );
    }
  }

  async function readImageAsset(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(t("errorImageLimit"));
    }
    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (isSvg) {
      const source = await file.text();
      const documentNode = new DOMParser().parseFromString(
        source,
        "image/svg+xml",
      );
      if (documentNode.querySelector("parsererror")) {
        throw new Error(t("errorSvgInvalid"));
      }
      const svg = documentNode.documentElement;
      if (svg.tagName.toLowerCase() !== "svg") {
        throw new Error(t("errorSvgRoot"));
      }
      documentNode
        .querySelectorAll("script, foreignObject, iframe, object, embed")
        .forEach((node) => {
          node.remove();
        });
      documentNode.querySelectorAll("style").forEach((node) => {
        const css = node.textContent || "";
        if (/@import|url\s*\(|expression\s*\(|-moz-binding|behavior\s*:/i.test(css)) {
          node.remove();
        }
      });
      documentNode.querySelectorAll("*").forEach((node) => {
        Array.from(node.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          const value = attribute.value.trim();
          if (name.startsWith("on")) node.removeAttribute(attribute.name);
          if (
            (name === "href" || name === "xlink:href") &&
            !/^(?:#|data:image\/(?:png|jpeg|webp);base64,)/i.test(value)
          ) {
            node.removeAttribute(attribute.name);
          }
          if (
            name === "style" &&
            /@import|url\s*\(|expression\s*\(|-moz-binding|behavior\s*:/i.test(
              value,
            )
          ) {
            node.removeAttribute(attribute.name);
          }
        });
      });
      const sanitized = new XMLSerializer().serializeToString(svg);
      const asset = {
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`,
        mimeType: "image/svg+xml",
      };
      if (!isSafeImageDataUrl(asset.src)) {
        throw new Error(t("errorSvgUnsupported"));
      }
      return asset;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error(t("errorImageType"));
    }
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(t("errorImageRead")));
      reader.readAsDataURL(file);
    });
    if (!isSafeImageDataUrl(src)) {
      throw new Error(t("errorImageUnsupported"));
    }
    return { src, mimeType: file.type };
  }

  async function beginBrandLogoImport(
    files: File[],
    targetElementId?: string,
  ) {
    if (!files.length || isBrandLogoReading) return;
    const target = targetElementId
      ? elementsRef.current.find(
          (element): element is BrandBarElement =>
            element.id === targetElementId && element.type === "brandBar",
        )
      : undefined;
    if (!target && !canAddElement()) return;
    const available = MAX_BRAND_LOGOS - (target?.logos.length || 0);
    if (available <= 0) {
      setToast(t("brandLogoLimit", { count: MAX_BRAND_LOGOS }));
      return;
    }
    let estimatedDataLength =
      target?.logos.reduce((total, logo) => total + logo.src.length, 0) || 0;
    const selectedFiles = files.slice(0, available).filter((file) => {
      const nextLength = estimatedDataLength + Math.ceil(file.size * 1.4);
      if (nextLength > MAX_BRAND_BAR_DATA_LENGTH) return false;
      estimatedDataLength = nextLength;
      return true;
    });
    if (!selectedFiles.length) {
      setToast(t("brandLogoTotalLimit"));
      return;
    }
    setIsBrandLogoReading(true);
    try {
      const logos = await Promise.all(
        selectedFiles.map(async (file) => {
          const asset = await readImageAsset(file);
          const image = await loadImage(asset.src);
          return {
            id: makeId("brand-logo"),
            name: file.name.replace(/\.[^.]+$/, "") || t("logo"),
            src: asset.src,
            mimeType: asset.mimeType,
            aspectRatio:
              image.naturalWidth > 0 && image.naturalHeight > 0
                ? image.naturalWidth / image.naturalHeight
                : 1,
            cropX: 50,
            cropY: 50,
            zoom: 1,
          } satisfies BrandLogo;
        }),
      );
      setBrandCropSession({
        targetElementId,
        logos,
        activeIndex: 0,
        direction: target?.direction || "horizontal",
        backgroundColor: target?.backgroundColor || "#ffffff",
      });
      if (files.length > selectedFiles.length) {
        setToast(
          files.length > available
            ? t("brandLogoLimit", { count: MAX_BRAND_LOGOS })
            : t("brandLogoTotalLimit"),
        );
      }
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : t("toastBrandBarFailed"),
      );
    } finally {
      setIsBrandLogoReading(false);
    }
  }

  function editBrandLogo(element: BrandBarElement, logoId: string) {
    const logo = element.logos.find((item) => item.id === logoId);
    if (!logo) return;
    setBrandCropSession({
      targetElementId: element.id,
      replaceLogoId: logo.id,
      logos: [{ ...logo }],
      activeIndex: 0,
      direction: element.direction,
      backgroundColor: element.backgroundColor,
    });
  }

  function updateActiveBrandCrop(patch: Partial<BrandLogo>) {
    setBrandCropSession((current) => {
      if (!current) return current;
      return {
        ...current,
        logos: current.logos.map((logo, index) =>
          index === current.activeIndex ? { ...logo, ...patch } : logo,
        ),
      };
    });
  }

  function handleBrandCropPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!brandCropSession) return;
    const logo = brandCropSession.logos[brandCropSession.activeIndex];
    if (!logo) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    brandCropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cropX: logo.cropX,
      cropY: logo.cropY,
    };
  }

  function handleBrandCropPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const dragState = brandCropDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const logo = brandCropSession?.logos[brandCropSession.activeIndex];
    if (!logo) return;
    updateActiveBrandCrop({
      cropX: clamp(
        dragState.cropX -
          ((event.clientX - dragState.startX) / rect.width) *
            (100 / logo.zoom),
        0,
        100,
      ),
      cropY: clamp(
        dragState.cropY -
          ((event.clientY - dragState.startY) / rect.height) *
            (100 / logo.zoom),
        0,
        100,
      ),
    });
  }

  function handleBrandCropPointerEnd(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (brandCropDragRef.current?.pointerId !== event.pointerId) return;
    brandCropDragRef.current = null;
  }

  function applyBrandCropSession() {
    if (!brandCropSession?.logos.length) return;
    const target = brandCropSession.targetElementId
      ? elementsRef.current.find(
          (element): element is BrandBarElement =>
            element.id === brandCropSession.targetElementId &&
            element.type === "brandBar",
        )
      : undefined;
    if (target) {
      if (brandCropSession.replaceLogoId) {
        const replacement = brandCropSession.logos[0];
        updateElement(target.id, {
          logos: target.logos.map((logo) =>
            logo.id === brandCropSession.replaceLogoId
              ? { ...replacement, id: logo.id }
              : logo,
          ),
        });
      } else {
        updateElement(target.id, {
          logos: [...target.logos, ...brandCropSession.logos].slice(
            0,
            MAX_BRAND_LOGOS,
          ),
        });
      }
      setSelectedElementId(target.id);
      setBrandCropSession(null);
      setToast(t("toastBrandBarUpdated"));
      return;
    }

    const { width, height } = getDefaultBrandBarDimensions(
      brandCropSession.direction,
      badgeWidth,
      badgeHeight,
    );
    const element: BrandBarElement = {
      id: makeId("brand-bar"),
      name: t("brandBar"),
      type: "brandBar",
      x: Math.round(((badgeWidth - width) / 2) * 10) / 10,
      y: Math.round(((badgeHeight - height) / 2) * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      direction: brandCropSession.direction,
      gap: 2,
      padding: 2,
      backgroundColor: brandCropSession.backgroundColor,
      cornerRadius: 2,
      logos: brandCropSession.logos,
      opacity: 1,
      rotation: 0,
      locked: false,
      hidden: false,
    };
    mutateElements((current) => [...current, element]);
    setSelectedElementId(element.id);
    setBrandCropSession(null);
    setToast(t("toastBrandBarAdded"));
  }

  function moveBrandLogo(
    element: BrandBarElement,
    logoId: string,
    direction: "back" | "forward",
  ) {
    const index = element.logos.findIndex((logo) => logo.id === logoId);
    const nextIndex = direction === "back" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= element.logos.length) return;
    const logos = element.logos.map((logo) => ({ ...logo }));
    [logos[index], logos[nextIndex]] = [logos[nextIndex], logos[index]];
    updateElement(element.id, { logos });
  }

  function removeBrandLogo(element: BrandBarElement, logoId: string) {
    if (element.logos.length <= 1) {
      setToast(t("brandBarNeedsLogo"));
      return;
    }
    updateElement(element.id, {
      logos: element.logos.filter((logo) => logo.id !== logoId),
    });
  }

  function changeBrandBarDirection(
    element: BrandBarElement,
    direction: BrandBarDirection,
  ) {
    if (element.direction === direction) return;
    const candidate = {
      ...element,
      direction,
      width: element.height,
      height: element.width,
    };
    const bounds = getElementMoveBounds(candidate, badgeWidth, badgeHeight);
    updateElement(element.id, {
      direction,
      width: candidate.width,
      height: candidate.height,
      x: clamp(candidate.x, bounds.minX, bounds.maxX),
      y: clamp(candidate.y, bounds.minY, bounds.maxY),
    });
  }

  async function addImageElement(
    file: File | undefined,
    dropPoint?: { x: number; y: number },
  ) {
    if (!file) return;
    if (!canAddElement()) return;
    try {
      const asset = await readImageAsset(file);
      const image = await loadImage(asset.src);
      const naturalRatio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : 1;
      let width = Math.min(32, badgeWidth * 0.36);
      let height = width / naturalRatio;
      if (height > badgeHeight * 0.38) {
        height = badgeHeight * 0.38;
        width = height * naturalRatio;
      }
      width = clamp(width, 8, badgeWidth);
      height = clamp(height, 5, badgeHeight);
      const x = clamp(
        (dropPoint?.x ?? badgeWidth / 2) - width / 2,
        0,
        badgeWidth - width,
      );
      const y = clamp(
        (dropPoint?.y ?? 18 + height / 2) - height / 2,
        0,
        badgeHeight - height,
      );
      const element: ImageElement = {
        id: makeId("image"),
        type: "image",
        sourceKind: "upload",
        name: file.name.replace(/\.[^.]+$/, "") || t("imageGeneric"),
        src: asset.src,
        mimeType: asset.mimeType,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
        fit: "contain",
        aspectRatio: naturalRatio,
        opacity: 1,
        rotation: 0,
        locked: false,
        hidden: false,
      };
      mutateElements((current) => [...current, element]);
      setSelectedElementId(element.id);
      setToast(
        asset.mimeType === "image/svg+xml"
          ? t("toastSvgAdded")
          : t("toastImageAdded"),
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : t("toastImageFailed"),
      );
    }
  }

  async function replaceSelectedImage(file: File | undefined) {
    if (!file || !selectedElement || selectedElement.type !== "image") return;
    try {
      const asset = await readImageAsset(file);
      const image = await loadImage(asset.src);
      const aspectRatio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : selectedElement.aspectRatio;
      const width = Math.min(
        selectedElement.width,
        badgeWidth - selectedElement.x,
        (badgeHeight - selectedElement.y) * aspectRatio,
      );
      updateElement(selectedElement.id, {
        src: asset.src,
        mimeType: asset.mimeType,
        sourceKind: "upload",
        qrValue: undefined,
        name: file.name.replace(/\.[^.]+$/, "") || selectedElement.name,
        aspectRatio,
        width: Math.round(width * 10) / 10,
        height: Math.round((width / aspectRatio) * 10) / 10,
      });
      setToast(t("toastImageReplaced"));
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : t("toastImageReplaceFailed"),
      );
    }
  }

  function handleCanvasDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    void addImageElement(file, {
      x: ((event.clientX - rect.left) / rect.width) * badgeWidth,
      y: ((event.clientY - rect.top) / rect.height) * badgeHeight,
    });
  }

  function moveElementLayer(id: string, direction: "up" | "down") {
    mutateElements((current) => {
      const index = current.findIndex((element) => element.id === id);
      const nextIndex = direction === "up" ? index + 1 : index - 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function exportProject() {
    const project: BadgeProject = {
      format: PROJECT_FORMAT,
      version: PROJECT_VERSION,
      updatedAt: new Date().toISOString(),
      badgeWidth,
      badgeHeight,
      safeArea,
      backgroundColor,
      background,
      backgroundName,
      backgroundFit,
      elements,
      fields,
      rows,
      page,
      dpi,
      outputMode,
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `LanyardStudio_${badgeWidth}x${badgeHeight}mm.lanyardstudio.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setToast(t("toastProjectExported"));
  }

  async function importProject(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > MAX_PROJECT_BYTES) {
        throw new Error(t("errorProjectLimit"));
      }
      const rawProject: unknown = JSON.parse(await file.text());
      if (
        !isRecord(rawProject) ||
        !Array.isArray(rawProject.elements) ||
        !Array.isArray(rawProject.rows)
      ) {
        throw new Error(t("errorProjectInvalid"));
      }
      if (rawProject.elements.length > MAX_ELEMENTS) {
        throw new Error(t("errorProjectElements", { count: MAX_ELEMENTS }));
      }
      if (rawProject.rows.length > MAX_ROWS) {
        throw new Error(t("errorProjectRows", { count: MAX_ROWS }));
      }
      const project = normalizeProject(rawProject);
      if (!project) {
        throw new Error(t("errorProjectDamaged"));
      }
      setBadgeWidth(project.badgeWidth);
      setBadgeHeight(project.badgeHeight);
      setSafeArea(project.safeArea);
      setBackgroundColor(project.backgroundColor);
      setBackground(project.background);
      setBackgroundName(project.backgroundName);
      setBackgroundFit(project.backgroundFit);
      setElements(project.elements);
      elementsRef.current = project.elements;
      setFields(project.fields);
      setRows(project.rows);
      setPage(project.page);
      setDpi(project.dpi);
      setOutputMode(project.outputMode);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedElementId(project.elements.at(-1)?.id || null);
      setSelectedRowId(project.rows[0]?.id || "");
      resetDataHistory();
      setToast(t("toastProjectImported"));
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : t("toastProjectImportFailed"),
      );
    }
  }

  function handleCsv(file: File | undefined) {
    if (!file) return;
    setCsvError("");
    if (file.size > MAX_CSV_BYTES) {
      setCsvError(t("errorCsvLimit"));
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      preview: MAX_ROWS + 1,
      complete: (result) => {
        if (result.errors.some((error) => error.type === "Quotes")) {
          setCsvError(t("errorCsvQuotes"));
          return;
        }
        if ((result.meta.fields || []).length > MAX_FIELDS) {
          setCsvError(t("errorCsvFields", { count: MAX_FIELDS }));
          return;
        }
        if (result.data.length > MAX_ROWS) {
          setCsvError(t("errorCsvRows", { count: MAX_ROWS }));
          return;
        }
        const sourceFields = result.meta.fields || [];
        const importedFields = normalizeFields(sourceFields, []);
        if (!importedFields.length || !result.data.length) {
          setCsvError(t("errorCsvEmpty"));
          return;
        }
        const importedRows = result.data.map((row) => {
          const normalized: BadgeRow = { id: makeId("row") };
          importedFields.forEach((field) => {
            const sourceField =
              sourceFields.find(
                (candidate) =>
                  candidate.trim().slice(0, MAX_FIELD_LENGTH) === field,
              ) || field;
            normalized[field] = String(row[sourceField] ?? "").slice(
              0,
              MAX_CELL_LENGTH,
            );
          });
          return normalized;
        });
        rememberData();
        setFields(importedFields);
        setRows(importedRows);
        setSelectedRowId(importedRows[0].id);
        setToast(t("toastCsvImported", { count: importedRows.length }));
      },
      error: () => {
        setCsvError(t("errorCsvRead"));
      },
    });
  }

  function addField() {
    const value = newField.trim();
    if (!value) {
      setToast(t("errorFieldRequired"));
      return;
    }
    if (fields.includes(value)) {
      setToast(t("errorFieldDuplicate"));
      return;
    }
    if (FORBIDDEN_FIELD_NAMES.has(value)) {
      setToast(t("errorFieldReserved"));
      return;
    }
    if (value.length > MAX_FIELD_LENGTH) {
      setToast(t("errorFieldLength", { count: MAX_FIELD_LENGTH }));
      return;
    }
    if (fields.length >= MAX_FIELDS) {
      setToast(t("errorFieldCount", { count: MAX_FIELDS }));
      return;
    }
    rememberData();
    setFields((current) => [...current, value]);
    setRows((current) => current.map((row) => ({ ...row, [value]: "" })));
    setNewField("");
  }

  function focusNewFieldInput() {
    newFieldInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => newFieldInputRef.current?.focus());
  }

  function renameField(field: string, nextName: string) {
    const value = nextName.trim();
    if (value === field) return true;
    if (!value || fields.includes(value)) {
      setToast(value ? t("errorFieldDuplicate") : t("errorFieldRequired"));
      return false;
    }
    if (FORBIDDEN_FIELD_NAMES.has(value)) {
      setToast(t("errorFieldReserved"));
      return false;
    }
    if (value.length > MAX_FIELD_LENGTH) {
      setToast(t("errorFieldLength", { count: MAX_FIELD_LENGTH }));
      return false;
    }

    rememberData(true);
    setFields((current) =>
      current.map((candidate) => (candidate === field ? value : candidate)),
    );
    setRows((current) =>
      current.map((row) => {
        const next = { ...row, [value]: row[field] || "" };
        delete next[field];
        return next;
      }),
    );
    mutateElements(
      (current) =>
        current.map((element) =>
          element.type === "text" &&
          element.kind === "variable" &&
          element.field === field
            ? {
                ...element,
                field: value,
                name: element.name === field ? value : element.name,
              }
            : element,
        ),
      false,
    );
    return true;
  }

  function removeField(field: string) {
    if (fields.length <= 1) {
      setToast(t("errorFieldMinimum"));
      return;
    }
    if (!window.confirm(t("deleteVariableConfirm", { name: field }))) return;
    rememberData(true);
    setFields((current) => current.filter((item) => item !== field));
    setRows((current) =>
      current.map((row) => {
        const next = { ...row };
        delete next[field];
        return next;
      }),
    );
    mutateElements(
      (current) =>
        current.filter(
          (element) =>
            element.type !== "text" ||
            element.kind !== "variable" ||
            element.field !== field,
        ),
      false,
    );
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) {
      setToast(t("errorRowCount", { count: MAX_ROWS }));
      return;
    }
    rememberData();
    const row: BadgeRow = { id: makeId("row") };
    fields.forEach((field) => {
      row[field] = "";
    });
    setRows((current) => [...current, row]);
    setSelectedRowId(row.id);
  }

  function toggleDataRowSelection(rowId: string) {
    setSelectedDataRowIds((current) =>
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId],
    );
  }

  function toggleAllDataRows() {
    setSelectedDataRowIds((current) =>
      rows.length > 0 && current.length === rows.length
        ? []
        : rows.map((row) => row.id),
    );
  }

  function removeSelectedDataRows() {
    if (!selectedDataRowIds.length) return;
    const selectedIds = new Set(selectedDataRowIds);
    rememberData();
    const nextRows = rowsRef.current.filter((row) => !selectedIds.has(row.id));
    rowsRef.current = nextRows;
    setRows(nextRows);
    if (selectedIds.has(selectedRowIdRef.current)) {
      const nextSelectedRowId = nextRows[0]?.id || "";
      selectedRowIdRef.current = nextSelectedRowId;
      setSelectedRowId(nextSelectedRowId);
    }
    setSelectedDataRowIds([]);
  }

  function reorderDataRow(rowId: string, targetRowId: string) {
    if (rowId === targetRowId) return false;
    const current = rowsRef.current;
    const fromIndex = current.findIndex((row) => row.id === rowId);
    const targetIndex = current.findIndex((row) => row.id === targetRowId);
    if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
      return false;
    }
    const nextRows = [...current];
    const [movedRow] = nextRows.splice(fromIndex, 1);
    nextRows.splice(targetIndex, 0, movedRow);
    rowsRef.current = nextRows;
    setRows(nextRows);
    return true;
  }

  function moveDataRowBy(rowId: string, offset: number) {
    const current = rowsRef.current;
    const fromIndex = current.findIndex((row) => row.id === rowId);
    const targetIndex = clamp(fromIndex + offset, 0, current.length - 1);
    if (fromIndex < 0 || fromIndex === targetIndex) return;
    rememberData();
    reorderDataRow(rowId, current[targetIndex].id);
  }

  function handleDataRowPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    rowId: string,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dataRowPointerDragRef.current = {
      pointerId: event.pointerId,
      rowId,
      startY: event.clientY,
      moved: false,
      historyRecorded: false,
      lastTargetRowId: rowId,
    };
    setDraggedDataRowId(rowId);
  }

  function handleDataRowPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const dragState = dataRowPointerDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (!dragState.moved && Math.abs(event.clientY - dragState.startY) < 6) {
      return;
    }
    event.preventDefault();
    dragState.moved = true;
    const targetRow = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLTableRowElement>("tr[data-row-id]");
    const targetRowId = targetRow?.dataset.rowId;
    if (
      !targetRowId ||
      targetRowId === dragState.rowId ||
      targetRowId === dragState.lastTargetRowId
    ) {
      return;
    }
    if (!dragState.historyRecorded) {
      rememberData();
      dragState.historyRecorded = true;
    }
    if (reorderDataRow(dragState.rowId, targetRowId)) {
      dragState.lastTargetRowId = targetRowId;
    }
  }

  function endDataRowPointerDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const dragState = dataRowPointerDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dataRowPointerDragRef.current = null;
    setDraggedDataRowId(null);
  }

  function updateRow(id: string, field: string, value: string) {
    const cellKey = `${id}:${field}`;
    if (
      activeDataCellKeyRef.current !== cellKey ||
      !dataCellEditRecordedRef.current
    ) {
      rememberData();
      activeDataCellKeyRef.current = cellKey;
      dataCellEditRecordedRef.current = true;
    }
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, [field]: value.slice(0, MAX_CELL_LENGTH) }
          : row,
      ),
    );
  }

  function setPagePreset(preset: PagePreset) {
    if (preset === "custom") {
      setPage((current) => ({ ...current, preset }));
      return;
    }
    const dimensions = PAGE_PRESETS[preset];
    setPage((current) => ({
      ...current,
      preset,
      width: dimensions.width,
      height: dimensions.height,
    }));
  }

  async function exportPdf() {
    if (!layout.fits) {
      setToast(t("errorPaperFit"));
      return;
    }
    if (!rows.length) {
      setToast(t("errorRowsRequired"));
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: page.width > page.height ? "landscape" : "portrait",
        unit: "mm",
        format: [page.width, page.height],
        compress: true,
      });
      doc.setProperties({
        title: `LanyardStudio — ${t("printPreview")}`,
        subject: `${badgeWidth} × ${badgeHeight} mm`,
        creator: "LanyardStudio",
      });

      let processedRows = 0;
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        if (pageIndex > 0) {
          doc.addPage(
            [page.width, page.height],
            page.width > page.height ? "landscape" : "portrait",
          );
        }

        if (outputMode === "table-tent") {
          const row = rows[pageIndex];
          if (!row) continue;
          const rendered = await renderBadgeImage({
            badgeWidth,
            badgeHeight,
            backgroundColor,
            background,
            backgroundFit,
            elements,
            row,
            dpi,
          });
          const reversed = await rotateBadgeImage180(rendered);
          const panelHeight = page.height / 2;
          const x = (page.width - badgeWidth) / 2;
          const topY = (panelHeight - badgeHeight) / 2;
          const bottomY = panelHeight + topY;

          doc.addImage(
            reversed,
            getImageType(reversed),
            x,
            topY,
            badgeWidth,
            badgeHeight,
            undefined,
            "FAST",
          );
          doc.addImage(
            rendered,
            getImageType(rendered),
            x,
            bottomY,
            badgeWidth,
            badgeHeight,
            undefined,
            "FAST",
          );
          doc.setDrawColor(100, 116, 139);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(0, panelHeight, page.width, panelHeight);
          doc.setLineDashPattern([], 0);

          processedRows += 1;
          setExportProgress(Math.round((processedRows / rows.length) * 100));
          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() => resolve()),
          );
          continue;
        }

        const pageRows = rows.slice(
          pageIndex * layout.capacity,
          (pageIndex + 1) * layout.capacity,
        );

        for (let index = 0; index < pageRows.length; index += 1) {
          const row = pageRows[index];
          const column = index % layout.columns;
          const rowIndex = Math.floor(index / layout.columns);
          const x = layout.startX + column * (badgeWidth + page.gapX);
          const y = layout.startY + rowIndex * (badgeHeight + page.gapY);
          const rendered = await renderBadgeImage({
            badgeWidth,
            badgeHeight,
            backgroundColor,
            background,
            backgroundFit,
            elements,
            row,
            dpi,
          });

          doc.addImage(
            rendered,
            getImageType(rendered),
            x,
            y,
            badgeWidth,
            badgeHeight,
            undefined,
            "FAST",
          );

          processedRows += 1;
          setExportProgress(Math.round((processedRows / rows.length) * 100));
          if (processedRows % 4 === 0) {
            await new Promise<void>((resolve) =>
              window.requestAnimationFrame(() => resolve()),
            );
          }
        }

        // Draw cutting guides after every badge image so neighboring full-bleed
        // artwork cannot cover marks when the page gap is set to zero.
        if (page.showOutline || page.showCropMarks) {
          for (let index = 0; index < pageRows.length; index += 1) {
            const column = index % layout.columns;
            const rowIndex = Math.floor(index / layout.columns);
            const x = layout.startX + column * (badgeWidth + page.gapX);
            const y = layout.startY + rowIndex * (badgeHeight + page.gapY);

            if (page.showOutline) {
              doc.setDrawColor(116, 116, 116);
              doc.setLineWidth(0.12);
              doc.rect(x, y, badgeWidth, badgeHeight);
            }

            if (page.showCropMarks) {
              const mark = 3;
              const offset = 1;
              doc.setDrawColor(45, 45, 45);
              doc.setLineWidth(0.18);
              [
                [x - offset - mark, y, x - offset, y],
                [x, y - offset - mark, x, y - offset],
                [
                  x + badgeWidth + offset,
                  y,
                  x + badgeWidth + offset + mark,
                  y,
                ],
                [
                  x + badgeWidth,
                  y - offset - mark,
                  x + badgeWidth,
                  y - offset,
                ],
                [
                  x - offset - mark,
                  y + badgeHeight,
                  x - offset,
                  y + badgeHeight,
                ],
                [
                  x,
                  y + badgeHeight + offset,
                  x,
                  y + badgeHeight + offset + mark,
                ],
                [
                  x + badgeWidth + offset,
                  y + badgeHeight,
                  x + badgeWidth + offset + mark,
                  y + badgeHeight,
                ],
                [
                  x + badgeWidth,
                  y + badgeHeight + offset,
                  x + badgeWidth,
                  y + badgeHeight + offset + mark,
                ],
              ].forEach(([x1, y1, x2, y2]) => {
                doc.line(x1, y1, x2, y2);
              });
            }
          }
        }
      }

      const date = new Date().toISOString().slice(0, 10);
      doc.save(`LanyardStudio_${badgeWidth}x${badgeHeight}mm_${date}.pdf`);
      setToast(t("toastPdfReady"));
    } catch (error) {
      setToast(
        error instanceof Error
          ? t("errorPdf", { message: error.message })
          : t("errorPdfGeneric"),
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  const modeItems: Array<{
    id: Mode;
    label: string;
    icon: typeof LayoutTemplate;
  }> = [
    { id: "design", label: t("design"), icon: LayoutTemplate },
    { id: "data", label: t("data"), icon: Database },
    { id: "print", label: t("print"), icon: Printer },
  ];

  if (view === "landing") {
    return (
      <LandingPage
        savedProjects={savedProjects}
        onOpenProject={openSavedProject}
        onDeleteProject={removeSavedProject}
        onRenameProject={renameSavedProject}
        onSelectPreset={startWithPreset}
        onCustom={startCustomSize}
        locale={locale}
        setLocale={setLocale}
        t={t}
      />
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skipEditor")}
      </a>
      <header className="topbar">
        <div className="topbar-project">
          <button
            className="brand"
            type="button"
            onClick={() => {
              setMode("design");
              setView("landing");
            }}
            aria-label={t("startScreen")}
          >
            <BrandMark />
            <strong>LanyardStudio</strong>
          </button>

          {activeProject && (
            <label className="editor-project-name">
              <span>{t("projectName")}</span>
              <input
                value={activeProject.name}
                maxLength={MAX_PROJECT_NAME_LENGTH}
                onChange={(event) =>
                  setActiveProject((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
                onBlur={() =>
                  setActiveProject((current) =>
                    current
                      ? {
                          ...current,
                          name: normalizeProjectName(
                            current.name,
                            t("untitledProject"),
                          ),
                        }
                      : current,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                aria-label={t("projectName")}
              />
            </label>
          )}
        </div>

        <nav className="mode-nav" aria-label={t("steps")}>
          {modeItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? "is-active" : ""}
                onClick={() => setMode(item.id)}
                aria-current={mode === item.id ? "page" : undefined}
              >
                <span className="step-number">{index + 1}</span>
                <Icon size={17} />
                <span className="mode-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <AppControls
            locale={locale}
            setLocale={setLocale}
            t={t}
            compact
          />
          <span
            className={`save-state is-${saveStatus}`}
            title={
              saveStatus === "error"
                ? t("saveErrorHelp")
                : t("saveHelp")
            }
            role="status"
            aria-live="polite"
          >
            {saveStatus === "saving" ? (
              <LoaderCircle className="spin" size={14} />
            ) : saveStatus === "error" ? (
              <AlertTriangle size={14} />
            ) : (
              <Check size={14} />
            )}
            {saveStatus === "saving"
              ? t("saving")
              : saveStatus === "error"
                ? t("saveFailed")
                : t("saved")}
          </span>
          {mode !== "print" && (
            <button
              className="primary-button top-export"
              type="button"
              onClick={() => setMode(mode === "design" ? "data" : "print")}
              aria-label={mode === "design" ? t("data") : t("goPrint")}
              title={mode === "design" ? t("data") : t("goPrint")}
            >
              {mode === "design" ? (
                <Database size={17} aria-hidden="true" />
              ) : (
                <Printer size={17} aria-hidden="true" />
              )}
              <span>{mode === "design" ? t("data") : t("goPrint")}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <main id="main-content" className="main-content">
        {mode === "design" && (
          <div className="design-workspace">
            <button
              type="button"
              className={`responsive-panel-scrim ${
                responsiveToolPanel ? "is-visible" : ""
              }`}
              onClick={() => setResponsiveToolPanel(null)}
              aria-label={t("closeInspectorSheet")}
              aria-hidden={!responsiveToolPanel}
              tabIndex={responsiveToolPanel ? 0 : -1}
            />

            <aside
              className={`panel left-panel responsive-tool-panel ${
                responsiveToolPanel ? `is-open is-${responsiveToolPanel}` : ""
              }`}
              aria-label={t("designTools")}
            >
              <div className="responsive-tool-panel-header">
                <span className="responsive-tool-panel-handle" aria-hidden="true" />
                <strong>
                  {responsiveToolPanel === "badge"
                    ? t("badgeSize")
                    : responsiveToolPanel === "background"
                      ? t("backgroundImage")
                      : t("elementLibrary")}
                </strong>
                <button
                  type="button"
                  onClick={() => setResponsiveToolPanel(null)}
                  aria-label={t("closeInspectorSheet")}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="responsive-tool-panel-body">
              <section className="panel-section responsive-badge-section">
                <div className="section-title">
                  <h2>{t("badgeSize")}</h2>
                  <span>mm</span>
                </div>
                <div className="field-grid two-columns">
                  <label>
                    {t("width")}
                    <input
                      type="number"
                      min="20"
                      max="500"
                      step="0.5"
                      value={badgeWidth}
                      onChange={(event) => {
                        setBadgeWidth(Math.max(20, Number(event.target.value)));
                        setOutputMode("standard");
                      }}
                    />
                  </label>
                  <label>
                    {t("height")}
                    <input
                      type="number"
                      min="20"
                      max="500"
                      step="0.5"
                      value={badgeHeight}
                      onChange={(event) => {
                        setBadgeHeight(Math.max(20, Number(event.target.value)));
                        setOutputMode("standard");
                      }}
                    />
                  </label>
                </div>
                <label className="responsive-badge-safe-area">
                  <span>{t("safeArea", { value: "" }).replace(" mm", "")}</span>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={safeArea}
                    onChange={(event) => setSafeArea(Number(event.target.value))}
                  />
                  <strong>{safeArea} mm</strong>
                </label>
              </section>

              <section className="panel-section responsive-background-section">
                <div className="section-title">
                  <h2>{t("backgroundImage")}</h2>
                </div>
                <label className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      handleBackground(event.target.files?.[0])
                    }
                  />
                  {background ? (
                    <>
                      <span
                        className="background-thumb"
                        style={{ backgroundImage: `url("${background}")` }}
                      />
                      <span className="upload-copy">
                        <strong>{backgroundName || t("backgroundImage")}</strong>
                        <small>{t("changeImage")}</small>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">
                        <ImagePlus size={20} />
                      </span>
                      <span className="upload-copy">
                        <strong>{t("chooseImage")}</strong>
                        <small>{t("backgroundHint")}</small>
                      </span>
                    </>
                  )}
                </label>
                {background && (
                  <div className="inline-actions">
                    <label className="compact-select">
                      {t("fit")}
                      <select
                        value={backgroundFit}
                        onChange={(event) =>
                          setBackgroundFit(event.target.value as BackgroundFit)
                        }
                      >
                        <option value="cover">{t("cover")}</option>
                        <option value="contain">{t("contain")}</option>
                        <option value="stretch">{t("stretch")}</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-text-button danger-text"
                      onClick={() => {
                        setBackground(null);
                        setBackgroundName("");
                      }}
                    >
                      <Trash2 size={15} />
                      {t("remove")}
                    </button>
                  </div>
                )}
                <label className="background-color-control">
                  <span>
                    <Palette size={15} />
                    {t("backgroundColor")}
                  </span>
                  <span>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) =>
                        setBackgroundColor(event.target.value)
                      }
                      aria-label={t("backgroundColor")}
                    />
                    <code>{backgroundColor.toUpperCase()}</code>
                  </span>
                </label>
              </section>

              <section className="panel-section responsive-element-section">
                <div className="section-title">
                  <h2>{t("imageLogo")}</h2>
                </div>
                <label className="asset-upload-button">
                  <span className="upload-icon">
                    <ImageIcon size={19} />
                  </span>
                  <span className="upload-copy">
                    <strong>{t("addImageSvg")}</strong>
                    <small>{t("assetHint")}</small>
                  </span>
                  <Plus size={16} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                    onChange={(event) => {
                      void addImageElement(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <label
                  ref={brandBarLaunchButtonRef}
                  className={`asset-upload-button brand-bar-upload-button ${isBrandLogoReading ? "is-loading" : ""}`}
                >
                  <span className="upload-icon">
                    {isBrandLogoReading ? (
                      <LoaderCircle className="spin" size={19} />
                    ) : (
                      <GalleryHorizontal size={19} />
                    )}
                  </span>
                  <span className="upload-copy">
                    <strong>
                      {isBrandLogoReading
                        ? t("loadingLogos")
                        : t("addBrandBar")}
                    </strong>
                    <small>{t("selectMultipleLogos")}</small>
                  </span>
                  <Plus size={16} />
                  <input
                    type="file"
                    multiple
                    disabled={isBrandLogoReading}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                    onChange={(event) => {
                      void beginBrandLogoImport(
                        Array.from(event.target.files || []),
                      );
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </section>

              <section className="panel-section element-library-section responsive-element-section">
                <div className="section-title">
                  <h2>{t("textElements")}</h2>
                </div>
                <div className="element-palette-grid text-palette-grid">
                  <button type="button" onClick={() => addStaticElement("heading")}>
                    <Type size={18} aria-hidden="true" />
                    <span>{t("headingText")}</span>
                  </button>
                  <button type="button" onClick={() => addStaticElement("body")}>
                    <Type size={16} aria-hidden="true" />
                    <span>{t("bodyText")}</span>
                  </button>
                  <button type="button" onClick={() => addStaticElement("caption")}>
                    <Type size={14} aria-hidden="true" />
                    <span>{t("captionText")}</span>
                  </button>
                </div>
              </section>

              <section className="panel-section element-library-section responsive-element-section">
                <div className="section-title">
                  <h2>{t("shapes")}</h2>
                </div>
                <div className="element-palette-grid shape-palette-grid">
                  <button type="button" onClick={() => addShapeElement("rectangle")}>
                    <Square size={18} aria-hidden="true" />
                    <span>{t("rectangle")}</span>
                  </button>
                  <button type="button" onClick={() => addShapeElement("ellipse")}>
                    <Circle size={18} aria-hidden="true" />
                    <span>{t("ellipse")}</span>
                  </button>
                  <button type="button" onClick={() => addShapeElement("line")}>
                    <Minus size={19} aria-hidden="true" />
                    <span>{t("line")}</span>
                  </button>
                </div>
              </section>

              <section className="panel-section element-library-section responsive-element-section grow-section qr-launch-section">
                <button
                  ref={qrLaunchButtonRef}
                  type="button"
                  className="secondary-button full-width qr-launch-button"
                  onClick={() => setIsQrDialogOpen(true)}
                >
                  <QrCode size={17} aria-hidden="true" />
                  {t("generateQrCode")}
                </button>
              </section>
              </div>
            </aside>

            <section className="canvas-workspace" aria-label={t("badgeCanvas")}>
              <nav className="responsive-editor-toolbar" aria-label={t("designTools")}>
                <button
                  type="button"
                  className={responsiveToolPanel === "badge" ? "is-active" : ""}
                  onClick={() => openResponsiveToolPanel("badge")}
                  aria-pressed={responsiveToolPanel === "badge"}
                >
                  <Ruler size={19} aria-hidden="true" />
                  <span>{t("badgeSize")}</span>
                </button>
                <button
                  type="button"
                  className={responsiveToolPanel === "background" ? "is-active" : ""}
                  onClick={() => openResponsiveToolPanel("background")}
                  aria-pressed={responsiveToolPanel === "background"}
                >
                  <ImageIcon size={19} aria-hidden="true" />
                  <span>{t("backgroundImage")}</span>
                </button>
                <button
                  type="button"
                  className={responsiveToolPanel === "elements" ? "is-active" : ""}
                  onClick={() => openResponsiveToolPanel("elements")}
                  aria-pressed={responsiveToolPanel === "elements"}
                >
                  <Plus size={19} aria-hidden="true" />
                  <span>{t("elementLibrary")}</span>
                </button>
                <button type="button" onClick={openResponsiveLayerPanel}>
                  <Layers3 size={19} aria-hidden="true" />
                  <span>{t("layers")}</span>
                </button>
              </nav>
              <div className="canvas-toolbar">
                <div>
                  <CreditCard className="canvas-side-icon" size={14} />
                  <strong>{t("front")}</strong>
                  <span>{t("safeArea", { value: safeArea })}</span>
                </div>
                <div className="toolbar-controls">
                  <fieldset
                    className="toolbar-icon-group"
                    aria-label={t("editingHistory")}
                  >
                    <button
                      type="button"
                      onClick={undoElements}
                      disabled={!historyPast.length}
                      title={`${t("undo")} (⌘Z)`}
                      aria-label={t("undo")}
                    >
                      <Undo2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={redoElements}
                      disabled={!historyFuture.length}
                      title={`${t("redo")} (⇧⌘Z)`}
                      aria-label={t("redo")}
                    >
                      <Redo2 size={16} />
                    </button>
                  </fieldset>
                  <div className="project-tools">
                    <label title={t("loadProjectTitle")}>
                      <FolderOpen size={15} />
                      {t("loadProject")}
                      <input
                        type="file"
                        accept=".json,.lanyardstudio.json,application/json"
                        onChange={(event) => {
                          void importProject(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={exportProject}
                      title={t("backupTitle")}
                    >
                      <Archive size={15} />
                      {t("backup")}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="canvas-stage"
                onPointerDown={() => {
                  setSelection([]);
                  setResponsiveToolPanel(null);
                  snapInspectorSheet("collapsed");
                  setCanvasContextMenu(null);
                }}
              >
                <div className="measurement measurement-top">
                  <span>0</span>
                  <strong>{displayNumber(badgeWidth)} mm</strong>
                </div>
                <div className="measurement measurement-left">
                  <span>0</span>
                  <strong>{displayNumber(badgeHeight)} mm</strong>
                </div>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag and drop is supplementary to the accessible image file picker. */}
                <div
                  className="badge-frame"
                  ref={stageRef}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleCanvasDrop}
                  style={{ "--frame-ratio": `${badgeWidth} / ${badgeHeight}` } as CSSProperties}
                >
                  <BadgeContents
                    badgeWidth={badgeWidth}
                    badgeHeight={badgeHeight}
                    safeArea={safeArea}
                    backgroundColor={backgroundColor}
                    background={background}
                    backgroundFit={backgroundFit}
                    elements={elements}
                    row={undefined}
                    selectedElementIds={selectedElementIds}
                    snapGuides={snapGuides}
                    interactive
                    onSelect={(id, additive) => {
                      const element = elementsRef.current.find(
                        (item) => item.id === id,
                      );
                      if (element) selectCanvasElement(element, additive);
                    }}
                    onPointerDown={handlePointerDown}
                    onResizePointerDown={handleResizePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onKeyMove={handleKeyMove}
                    onElementContextMenu={handleElementContextMenu}
                    t={t}
                  />
                </div>
              </div>

              <div className="canvas-footer">
                <span>
                  <MousePointer2 size={15} />
                  {t("canvasHelp")}
                </span>
                <label>
                  {t("safeArea", { value: "" }).replace(" mm", "")}
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={safeArea}
                    onChange={(event) => setSafeArea(Number(event.target.value))}
                  />
                  <strong>{safeArea} mm</strong>
                </label>
              </div>
            </section>

            <button
              type="button"
              className={`inspector-sheet-scrim ${
                inspectorSheetState !== "collapsed" ? "is-visible" : ""
              }`}
              onClick={() => snapInspectorSheet("collapsed")}
              aria-label={t("closeInspectorSheet")}
              aria-hidden={inspectorSheetState === "collapsed"}
              tabIndex={inspectorSheetState !== "collapsed" ? 0 : -1}
            />

            <aside
              id="tablet-inspector-sheet"
              className={`panel right-panel inspector-sheet is-${inspectorSheetState} ${
                isInspectorSheetDragging ? "is-dragging" : ""
              } ${responsiveToolPanel ? "is-suppressed" : ""}`}
              aria-label={t("elementProperties")}
              style={
                {
                  "--inspector-sheet-drag-offset": `${inspectorSheetDragOffset}px`,
                } as CSSProperties
              }
            >
              <div className="inspector-sheet-toolbar">
                <button
                  type="button"
                  className="inspector-sheet-grip"
                  onPointerDown={handleInspectorSheetPointerDown}
                  onPointerMove={handleInspectorSheetPointerMove}
                  onPointerUp={handleInspectorSheetPointerEnd}
                  onPointerCancel={cancelInspectorSheetPointer}
                  onClick={toggleInspectorSheet}
                  aria-label={
                    inspectorSheetState === "collapsed"
                      ? t("expandInspectorSheet")
                      : t("collapseInspectorSheet")
                  }
                  aria-expanded={inspectorSheetState !== "collapsed"}
                  aria-controls="tablet-inspector-sheet"
                >
                  <span className="inspector-sheet-handle" aria-hidden="true" />
                </button>
                <span className="inspector-sheet-copy">
                  <strong>
                    {selectedElement
                      ? getElementLabel(selectedElement, t)
                      : selectedElements.length > 1
                        ? t("selectedElementCount", {
                            count: selectedElements.length,
                          })
                      : t("inspectorSheetOverview")}
                  </strong>
                  <small>{t("inspectorSheetDragHint")}</small>
                </span>
                <button
                  type="button"
                  className="inspector-sheet-action"
                  onClick={() => moveInspectorSheet("up")}
                  disabled={inspectorSheetState === "expanded"}
                  aria-label={t("expandInspectorSheet")}
                >
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inspector-sheet-action"
                  onClick={() => moveInspectorSheet("down")}
                  disabled={inspectorSheetState === "collapsed"}
                  aria-label={t("collapseInspectorSheet")}
                >
                  <ArrowDown size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inspector-side-close"
                  onClick={() => snapInspectorSheet("collapsed")}
                  aria-label={t("closeInspectorSheet")}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="inspector-sheet-body">
              {selectedElement ? (
                <>
                  <section className="panel-section element-header">
                    <label className="element-name-field">
                      <span className="element-name-label">
                        {t("elementName")}
                      </span>
                      <input
                        value={selectedElement.name}
                        maxLength={160}
                        onFocus={rememberElements}
                        onChange={(event) =>
                          updateElement(
                            selectedElement.id,
                            { name: event.target.value },
                            false,
                          )
                        }
                        aria-label={t("elementName")}
                      />
                    </label>
                    <div className="element-header-actions">
                      <button
                        type="button"
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            locked: !selectedElement.locked,
                          })
                        }
                        title={
                          selectedElement.locked ? t("unlock") : t("lock")
                        }
                        aria-label={
                          selectedElement.locked ? t("unlock") : t("lock")
                        }
                      >
                        {selectedElement.locked ? (
                          <Unlock size={16} aria-hidden="true" />
                        ) : (
                          <Lock size={16} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={duplicateSelected}
                        title={t("duplicate")}
                        aria-label={t("duplicate")}
                      >
                        <Copy size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="danger-text"
                        onClick={deleteSelected}
                        disabled={selectedElement.locked}
                        title={t("delete")}
                        aria-label={t("delete")}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </section>

                  {selectedElement.type === "text" ? (
                    <>
                      <section className="panel-section">
                        <div className="section-title">
                          <h2>{t("content")}</h2>
                        </div>
                        {selectedElement.kind === "variable" ? (
                          <label className="stacked-field">
                            {t("linkedVariable")}
                            <select
                              value={selectedElement.field || ""}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  field: event.target.value,
                                })
                              }
                            >
                              {fields.map((field) => (
                                <option key={field} value={field}>
                                  {field}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <label className="stacked-field">
                            {t("displayText")}
                            <input
                              value={selectedElement.value || ""}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  value: event.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                      </section>

                      <section className="panel-section">
                        <div className="section-title">
                          <h2>{t("typography")}</h2>
                        </div>
                        <label className="stacked-field font-family-field">
                          {t("fontFamily")}
                          <select
                            value={selectedElement.fontFamily}
                            style={{
                              fontFamily: getFontFamily(
                                selectedElement.fontFamily,
                              ),
                            }}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                fontFamily: event.target.value as FontFamilyKey,
                              })
                            }
                          >
                            {FONT_FAMILIES.map((font) => (
                              <option
                                key={font.value}
                                value={font.value}
                                style={{ fontFamily: font.stack }}
                              >
                                {t(font.labelKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="field-grid two-columns">
                          <label>
                            {t("size")}
                            <div className="input-with-unit">
                              <input
                                type="number"
                                min="6"
                                max="120"
                                value={selectedElement.fontSize}
                                onChange={(event) =>
                                  updateElement(selectedElement.id, {
                                    fontSize: Number(event.target.value),
                                  })
                                }
                              />
                              <span>pt</span>
                            </div>
                          </label>
                          <label>
                            {t("weight")}
                            <select
                              value={selectedElement.fontWeight}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  fontWeight: Number(event.target.value),
                                })
                              }
                            >
                              <option value="400">{t("normal")}</option>
                              <option value="500">{t("medium")}</option>
                              <option value="600">{t("semibold")}</option>
                              <option value="700">{t("bold")}</option>
                              <option value="800">{t("extraBold")}</option>
                            </select>
                          </label>
                        </div>
                        <div className="property-row">
                          <fieldset
                            className="align-control"
                            aria-label={t("textAlignment")}
                          >
                            {(
                              [
                                ["left", AlignLeft],
                                ["center", AlignCenter],
                                ["right", AlignRight],
                              ] as const
                            ).map(([align, Icon]) => (
                              <button
                                key={align}
                                type="button"
                                className={
                                  selectedElement.align === align
                                    ? "is-active"
                                    : ""
                                }
                                onClick={() =>
                                  updateElement(selectedElement.id, { align })
                                }
                                aria-label={
                                  align === "left"
                                    ? t("alignLeft")
                                    : align === "center"
                                      ? t("alignCenter")
                                      : t("alignRight")
                                }
                              >
                                <Icon size={17} />
                              </button>
                            ))}
                          </fieldset>
                          <label className="color-control">
                            <input
                              type="color"
                              value={selectedElement.color}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  color: event.target.value,
                                })
                              }
                              aria-label={t("textColor")}
                            />
                            <span>{selectedElement.color.toUpperCase()}</span>
                          </label>
                        </div>
                      </section>
                    </>
                  ) : selectedElement.type === "image" ? (
                    <section className="panel-section">
                      <div className="section-title">
                        <h2>
                          {selectedElement.sourceKind === "qr"
                            ? t("qrCode")
                            : t("image")}
                        </h2>
                        <span>{t("keepRatio")}</span>
                      </div>
                      <div className="image-inspector-preview">
                        <img src={selectedElement.src} alt="" />
                        <div>
                          <strong>{selectedElement.name}</strong>
                          <small>
                            {selectedElement.sourceKind === "qr"
                              ? t("qrCode")
                              : selectedElement.mimeType === "image/svg+xml"
                                ? t("vectorSvg")
                                : t("rasterImage")}
                          </small>
                        </div>
                      </div>
                      {selectedElement.sourceKind === "qr" && (
                        <label className="stacked-field qr-inspector-field">
                          {t("qrContent")}
                          <input
                            key={`${selectedElement.id}:${selectedElement.qrValue || ""}`}
                            defaultValue={selectedElement.qrValue || ""}
                            maxLength={MAX_CELL_LENGTH}
                            onFocus={rememberElements}
                            onBlur={(event) =>
                              void regenerateQrElement(
                                selectedElement.id,
                                event.currentTarget.value,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                        </label>
                      )}
                      <div className="image-inspector-actions">
                        {selectedElement.sourceKind !== "qr" && (
                          <label className="secondary-button">
                            <ImagePlus size={15} />
                            {t("replaceImage")}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                              onChange={(event) => {
                                void replaceSelectedImage(
                                  event.target.files?.[0],
                                );
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                        )}
                        <label className="stacked-field compact-fit-field">
                          {t("fit")}
                          <select
                            value={selectedElement.fit}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                fit: event.target.value as BackgroundFit,
                              })
                            }
                          >
                            <option value="contain">{t("contain")}</option>
                            <option value="cover">{t("fillArea")}</option>
                            <option value="stretch">{t("stretch")}</option>
                          </select>
                        </label>
                      </div>
                    </section>
                  ) : selectedElement.type === "brandBar" ? (
                    <section className="panel-section brand-bar-inspector">
                      <div className="section-title">
                        <h2>{t("brandBar")}</h2>
                        <span>
                          {t("logoCount", {
                            count: selectedElement.logos.length,
                          })}
                        </span>
                      </div>
                      <fieldset
                        className="brand-direction-control"
                        aria-label={t("brandBarDirection")}
                      >
                        <button
                          type="button"
                          className={
                            selectedElement.direction === "horizontal"
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            changeBrandBarDirection(
                              selectedElement,
                              "horizontal",
                            )
                          }
                        >
                          <Columns3 size={16} aria-hidden="true" />
                          {t("horizontal")}
                        </button>
                        <button
                          type="button"
                          className={
                            selectedElement.direction === "vertical"
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            changeBrandBarDirection(selectedElement, "vertical")
                          }
                        >
                          <Rows3 size={16} aria-hidden="true" />
                          {t("vertical")}
                        </button>
                      </fieldset>
                      <div className="brand-bar-style-grid">
                        <label className="shape-color-field">
                          <span>{t("backgroundColor")}</span>
                          <input
                            type="color"
                            value={selectedElement.backgroundColor}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                backgroundColor: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {t("logoGap")}
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            value={selectedElement.gap}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                gap: clamp(
                                  Number(event.target.value),
                                  0,
                                  30,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          {t("innerPadding")}
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            value={selectedElement.padding}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                padding: clamp(
                                  Number(event.target.value),
                                  0,
                                  30,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          {t("cornerRadius")}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={selectedElement.cornerRadius}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                cornerRadius: clamp(
                                  Number(event.target.value),
                                  0,
                                  100,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="brand-logo-list">
                        {selectedElement.logos.map((logo, index) => (
                          <div className="brand-logo-row" key={logo.id}>
                            <span className="brand-logo-thumb">
                              <img src={logo.src} alt="" />
                            </span>
                            <strong title={logo.name}>{logo.name}</strong>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  moveBrandLogo(
                                    selectedElement,
                                    logo.id,
                                    "back",
                                  )
                                }
                                disabled={index === 0}
                                title={t("moveLogoBack")}
                                aria-label={t("moveLogoBack")}
                              >
                                <ChevronLeft size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  moveBrandLogo(
                                    selectedElement,
                                    logo.id,
                                    "forward",
                                  )
                                }
                                disabled={
                                  index === selectedElement.logos.length - 1
                                }
                                title={t("moveLogoForward")}
                                aria-label={t("moveLogoForward")}
                              >
                                <ChevronRight size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  editBrandLogo(selectedElement, logo.id)
                                }
                                title={t("editCrop")}
                                aria-label={t("editCrop")}
                              >
                                <Crop size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="danger-text"
                                onClick={() =>
                                  removeBrandLogo(selectedElement, logo.id)
                                }
                                title={t("removeLogo")}
                                aria-label={t("removeLogo")}
                              >
                                <Trash2 size={14} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <label
                        className={`secondary-button brand-logo-add-button ${isBrandLogoReading ? "is-loading" : ""}`}
                      >
                        {isBrandLogoReading ? (
                          <LoaderCircle
                            className="spin"
                            size={15}
                            aria-hidden="true"
                          />
                        ) : (
                          <ImagePlus size={15} aria-hidden="true" />
                        )}
                        {isBrandLogoReading
                          ? t("loadingLogos")
                          : t("addMoreLogos")}
                        <input
                          type="file"
                          multiple
                          disabled={isBrandLogoReading}
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                          onChange={(event) => {
                            void beginBrandLogoImport(
                              Array.from(event.target.files || []),
                              selectedElement.id,
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </section>
                  ) : (
                    <section className="panel-section">
                      <div className="section-title">
                        <h2>{t("shapes")}</h2>
                      </div>
                      <label className="stacked-field">
                        {t("shapeType")}
                        <select
                          value={selectedElement.shapeKind}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              shapeKind: event.target.value as ShapeKind,
                            })
                          }
                        >
                          <option value="rectangle">{t("rectangle")}</option>
                          <option value="ellipse">{t("ellipse")}</option>
                          <option value="line">{t("line")}</option>
                        </select>
                      </label>
                      <div className="shape-style-grid">
                        {selectedElement.shapeKind !== "line" && (
                          <label className="shape-color-field">
                            <span>{t("fillColor")}</span>
                            <input
                              type="color"
                              value={selectedElement.fill}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  fill: event.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                        <label className="shape-color-field">
                          <span>{t("strokeColor")}</span>
                          <input
                            type="color"
                            value={selectedElement.stroke}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                stroke: event.target.value,
                              })
                            }
                          />
                        </label>
                        {selectedElement.shapeKind !== "line" && (
                          <label>
                            {t("strokeWidth")}
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.2"
                              value={selectedElement.strokeWidth}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  strokeWidth: clamp(
                                    Number(event.target.value),
                                    0,
                                    20,
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                        {selectedElement.shapeKind === "rectangle" && (
                          <label>
                            {t("cornerRadius")}
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={selectedElement.cornerRadius}
                              onChange={(event) =>
                                updateElement(selectedElement.id, {
                                  cornerRadius: clamp(
                                    Number(event.target.value),
                                    0,
                                    100,
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="panel-section">
                    <div className="section-title">
                      <h2>{t("positionSize")}</h2>
                      <span>mm</span>
                    </div>
                    <div
                      className={`field-grid ${selectedElement.type === "text" ? "three-columns" : "two-columns"}`}
                    >
                      <label>
                        X
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.x}
                          onChange={(event) => {
                            const bounds = getElementMoveBounds(
                              selectedElement,
                              badgeWidth,
                              badgeHeight,
                            );
                            updateElement(selectedElement.id, {
                              x: clamp(
                                Number(event.target.value),
                                bounds.minX,
                                bounds.maxX,
                              ),
                            });
                          }}
                        />
                      </label>
                      <label>
                        Y
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.y}
                          onChange={(event) => {
                            const bounds = getElementMoveBounds(
                              selectedElement,
                              badgeWidth,
                              badgeHeight,
                            );
                            updateElement(selectedElement.id, {
                              y: clamp(
                                Number(event.target.value),
                                bounds.minY,
                                bounds.maxY,
                              ),
                            });
                          }}
                        />
                      </label>
                      <label>
                        {t("width")}
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          value={selectedElement.width}
                          onChange={(event) => {
                            const width = clamp(
                              Number(event.target.value),
                              5,
                              selectedElement.type === "image"
                                ? Math.min(
                                    badgeWidth * 2,
                                    badgeHeight *
                                      2 *
                                      selectedElement.aspectRatio,
                                  )
                                : badgeWidth * 2,
                            );
                            updateElement(
                              selectedElement.id,
                              selectedElement.type === "image"
                                ? {
                                    width,
                                    height:
                                      Math.round(
                                        (width /
                                          selectedElement.aspectRatio) *
                                          10,
                                      ) / 10,
                                  }
                                : { width },
                            );
                          }}
                        />
                      </label>
                      {selectedElement.type !== "text" && (
                        <label>
                          {t("height")}
                          <input
                            type="number"
                            step="0.5"
                            min={
                              selectedElement.type === "shape" &&
                              selectedElement.shapeKind === "line"
                                ? 0.5
                                : 5
                            }
                            value={selectedElement.height}
                            onChange={(event) => {
                              const height = clamp(
                                Number(event.target.value),
                                selectedElement.type === "shape" &&
                                  selectedElement.shapeKind === "line"
                                  ? 0.5
                                  : 5,
                                selectedElement.type === "image"
                                  ? Math.min(
                                      badgeHeight * 2,
                                      (badgeWidth * 2) /
                                        selectedElement.aspectRatio,
                                    )
                                  : badgeHeight * 2,
                              );
                              updateElement(
                                selectedElement.id,
                                selectedElement.type === "image"
                                  ? {
                                      height,
                                      width:
                                        Math.round(
                                          height *
                                            selectedElement.aspectRatio *
                                            10,
                                        ) / 10,
                                    }
                                  : { height },
                              );
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="field-grid two-columns advanced-fields">
                      <label>
                        {t("rotation")}
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="-180"
                            max="180"
                            step="1"
                            value={selectedElement.rotation}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                rotation: clamp(
                                  Number(event.target.value),
                                  -180,
                                  180,
                                ),
                              })
                            }
                          />
                          <span>°</span>
                        </div>
                      </label>
                      <label>
                        {t("opacity")}
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(selectedElement.opacity * 100)}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                opacity:
                                  clamp(
                                    Number(event.target.value),
                                    0,
                                    100,
                                  ) / 100,
                              })
                            }
                          />
                          <span>%</span>
                        </div>
                      </label>
                    </div>
                  </section>

                  <section className="panel-section">
                    <div className="section-title">
                      <h2>{t("badgeAlignment")}</h2>
                      <span>{t("centerAlignment")}</span>
                    </div>
                    <div className="center-align-actions">
                      <button
                        type="button"
                        onClick={() => alignSelectedToCenter("horizontal")}
                      >
                        <span>
                          <MoveHorizontal size={18} />
                        </span>
                        <strong>{t("horizontalCenter")}</strong>
                        <small>{t("horizontalCenterHelp")}</small>
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelectedToCenter("vertical")}
                      >
                        <span>
                          <MoveVertical size={18} />
                        </span>
                        <strong>{t("verticalCenter")}</strong>
                        <small>{t("verticalCenterHelp")}</small>
                      </button>
                    </div>
                  </section>

                </>
              ) : selectedElements.length > 1 ? (
                <section className="panel-section multi-selection-inspector">
                  <div className="multi-selection-heading">
                    <span className="multi-selection-icon" aria-hidden="true">
                      <MousePointer2 size={18} />
                    </span>
                    <strong>
                      {t("selectedElementCount", {
                        count: selectedElements.length,
                      })}
                    </strong>
                  </div>
                  <div className="multi-selection-actions">
                    {selectedGroupId ? (
                      <button
                        type="button"
                        onClick={() => ungroupElements(selectedGroupId)}
                      >
                        <Ungroup size={16} aria-hidden="true" />
                        {t("ungroupElements")}
                      </button>
                    ) : (
                      <button type="button" onClick={() => groupElements()}>
                        <Group size={16} aria-hidden="true" />
                        {t("groupElements")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="danger-text"
                      onClick={deleteSelected}
                      disabled={selectedElements.every((element) => element.locked)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      {t("delete")}
                    </button>
                  </div>
                </section>
              ) : (
                <div className="empty-inspector">
                  <span>
                    <MousePointer2 size={23} />
                  </span>
                  <h3>{t("selectElement")}</h3>
                  <p>{t("selectElementHelp")}</p>
                </div>
              )}

              {!selectedElement && selectedElements.length === 0 && (
                <>
                  <section className="panel-section layer-panel">
                    <div className="section-title">
                      <h2>
                        <Layers3 size={15} />
                        {t("layers")}
                      </h2>
                      <span>{t("topIsFront")}</span>
                    </div>
                    <div className="layer-list">
                      {[...elements].reverse().map((element) => (
                        <div
                          key={element.id}
                          className={`layer-row ${selectedElementIds.includes(element.id) ? "is-selected" : ""}`}
                        >
                          <button
                            type="button"
                            className="layer-main"
                            onClick={(event) =>
                              selectCanvasElement(
                                element,
                                event.metaKey || event.ctrlKey || event.shiftKey,
                              )
                            }
                          >
                            {element.type === "image" ? (
                              <ImageIcon size={14} />
                            ) : element.type === "brandBar" ? (
                              <GalleryHorizontal size={14} />
                            ) : element.type === "shape" ? (
                              <Square size={14} />
                            ) : (
                              <Type size={14} />
                            )}
                            <span>{getElementLabel(element, t)}</span>
                          </button>
                          <div className="layer-actions">
                            <button
                              type="button"
                              onClick={() =>
                                updateElement(element.id, {
                                  hidden: !element.hidden,
                                })
                              }
                              aria-label={
                                element.hidden
                                  ? t("showElement", {
                                      name: getElementLabel(element, t),
                                    })
                                  : t("hideElement", {
                                      name: getElementLabel(element, t),
                                    })
                              }
                            >
                              {element.hidden ? (
                                <EyeOff size={13} />
                              ) : (
                                <Eye size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateElement(element.id, {
                                  locked: !element.locked,
                                })
                              }
                              aria-label={
                                element.locked
                                  ? t("unlockElement", {
                                      name: getElementLabel(element, t),
                                    })
                                  : t("lockElement", {
                                      name: getElementLabel(element, t),
                                    })
                              }
                            >
                              {element.locked ? (
                                <Lock size={13} />
                              ) : (
                                <Unlock size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementLayer(element.id, "up")}
                              aria-label={t("moveForward", {
                                name: getElementLabel(element, t),
                              })}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementLayer(element.id, "down")}
                              aria-label={t("moveBackward", {
                                name: getElementLabel(element, t),
                              })}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel-section variable-connections">
                  <div className="section-title">
                    <h2>
                      <Database size={15} />
                      {t("variableConnections")}
                    </h2>
                    <span>{fields.length}</span>
                  </div>
                  <div className="variable-connection-list">
                    {fields.map((field) => {
                      const linkedElements = elements.filter(
                        (element): element is TextElement =>
                          element.type === "text" &&
                          element.kind === "variable" &&
                          element.field === field,
                      );
                      return (
                        <div
                          className="layer-row variable-connection-row"
                          key={field}
                        >
                          <div
                            className="layer-main variable-connection-main"
                          >
                            <Type size={14} aria-hidden="true" />
                            <label>
                              <span className="sr-only">
                                {t("renameVariable", { name: field })}
                              </span>
                              <input
                                defaultValue={field}
                                maxLength={MAX_FIELD_LENGTH}
                                onBlur={(event) => {
                                  if (!renameField(field, event.currentTarget.value)) {
                                    event.currentTarget.value = field;
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") event.currentTarget.blur();
                                  if (event.key === "Escape") {
                                    event.currentTarget.value = field;
                                    event.currentTarget.blur();
                                  }
                                }}
                              />
                            </label>
                            <span className="sr-only">
                              {t("connectedElementCount", {
                                count: linkedElements.length,
                              })}
                            </span>
                          </div>
                          <div className="variable-element-links">
                            {linkedElements.length ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const element = linkedElements[0];
                                    selectCanvasElement(element);
                                  }}
                                  title={getElementLabel(linkedElements[0], t)}
                                  aria-label={getElementLabel(linkedElements[0], t)}
                                >
                                  {getElementLabel(linkedElements[0], t)}
                                </button>
                                {linkedElements.length > 1 && (
                                  <span className="variable-link-count">
                                    +{linkedElements.length - 1}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="variable-unlinked">
                                {t("noLinkedElements")}
                              </span>
                            )}
                          </div>
                          <div className="variable-row-actions">
                            <button
                              type="button"
                              onClick={() => addVariableElement(field)}
                              title={t("addElementForVariable", { name: field })}
                              aria-label={t("addElementForVariable", { name: field })}
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="danger-text"
                              onClick={() => removeField(field)}
                              title={t("deleteField", { name: field })}
                              aria-label={t("deleteField", { name: field })}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="compact-variable-add">
                    <label>
                      <span className="sr-only">{t("newVariable")}</span>
                      <input
                        value={newField}
                        maxLength={MAX_FIELD_LENGTH}
                        placeholder={t("employeeNumber")}
                        onChange={(event) => setNewField(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addField();
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addField}
                      title={t("addVariable")}
                      aria-label={t("addVariable")}
                    >
                      <Plus size={15} aria-hidden="true" />
                    </button>
                  </div>
                  </section>
                </>
              )}
              </div>
            </aside>
          </div>
        )}

        {mode === "data" && (
          <div className="data-workspace">
            <section className="data-main">
              <div className="workspace-heading">
                <div>
                  <h1>{t("badgeData")}</h1>
                  <p>{t("dataHelp")}</p>
                </div>
                <div className="heading-actions">
                  <label className="secondary-button file-button">
                    <Upload size={16} />
                    {t("csvUpload")}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => handleCsv(event.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-button mobile-column-action"
                    onClick={focusNewFieldInput}
                    aria-controls="new-field"
                  >
                    <Columns3 size={16} aria-hidden="true" />
                    {t("newColumnVariable")}
                  </button>
                </div>
              </div>

              {csvError && (
                <div className="error-message" role="alert">
                  {csvError}
                </div>
              )}

              <div className="data-toolbar">
                <span>
                  <FileSpreadsheet size={17} />
                  {t("totalPeople", { count: rows.length })}
                </span>
                <div className="data-toolbar-end">
                  {selectedDataRowIds.length > 0 && (
                    <button
                      type="button"
                      className="delete-selected-rows"
                      onClick={removeSelectedDataRows}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {t("deleteSelectedRows", {
                        count: selectedDataRowIds.length,
                      })}
                    </button>
                  )}
                  <span className="data-hint">
                    {t("csvHint", { count: MAX_ROWS })}
                  </span>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="row-select">
                        <input
                          ref={selectAllRowsRef}
                          type="checkbox"
                          checked={rows.length > 0 && selectedDataRowIds.length === rows.length}
                          onChange={toggleAllDataRows}
                          aria-label={t("selectAllRows")}
                        />
                      </th>
                      <th className="row-reorder">
                        <span className="sr-only">
                          {t("reorderRow", { row: "" })}
                        </span>
                        <GripVertical size={15} aria-hidden="true" />
                      </th>
                      <th className="row-number">#</th>
                      {fields.map((field) => (
                        <th key={field}>
                          <span>{field}</span>
                          <button
                            type="button"
                            onClick={() => removeField(field)}
                            aria-label={t("deleteField", { name: field })}
                          >
                            <X size={13} />
                          </button>
                        </th>
                      ))}
                      <th className="add-column-cell">
                        <button
                          type="button"
                          onClick={focusNewFieldInput}
                          aria-label={t("newColumnVariable")}
                          title={t("newColumnVariable")}
                          aria-controls="new-field"
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        data-row-id={row.id}
                        className={`${
                          selectedRowId === row.id ? "is-selected" : ""
                        } ${
                          draggedDataRowId === row.id ? "is-reordering" : ""
                        }`}
                        onClick={() => setSelectedRowId(row.id)}
                      >
                        <td className="row-select">
                          <input
                            type="checkbox"
                            checked={selectedDataRowIds.includes(row.id)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleDataRowSelection(row.id)}
                            aria-label={t("selectRow", { row: rowIndex + 1 })}
                          />
                        </td>
                        <td className="row-reorder">
                          <button
                            type="button"
                            className="row-drag-handle"
                            onPointerDown={(event) =>
                              handleDataRowPointerDown(event, row.id)
                            }
                            onPointerMove={handleDataRowPointerMove}
                            onPointerUp={endDataRowPointerDrag}
                            onPointerCancel={endDataRowPointerDrag}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowUp") {
                                event.preventDefault();
                                moveDataRowBy(row.id, -1);
                              } else if (event.key === "ArrowDown") {
                                event.preventDefault();
                                moveDataRowBy(row.id, 1);
                              }
                            }}
                            aria-label={t("reorderRow", { row: rowIndex + 1 })}
                            title={`${t("moveRowUp", { row: rowIndex + 1 })} · ${t("moveRowDown", { row: rowIndex + 1 })}`}
                          >
                            <GripVertical size={17} aria-hidden="true" />
                          </button>
                        </td>
                        <td className="row-number">{rowIndex + 1}</td>
                        {fields.map((field) => (
                          <td key={field}>
                            <input
                              value={row[field] || ""}
                              maxLength={MAX_CELL_LENGTH}
                              onFocus={() => {
                                activeDataCellKeyRef.current = `${row.id}:${field}`;
                                dataCellEditRecordedRef.current = false;
                              }}
                              onChange={(event) =>
                                updateRow(row.id, field, event.target.value)
                              }
                              onBlur={() => {
                                activeDataCellKeyRef.current = null;
                                dataCellEditRecordedRef.current = false;
                              }}
                              aria-label={t("rowField", {
                                row: rowIndex + 1,
                                name: field,
                              })}
                            />
                          </td>
                        ))}
                        <td className="add-column-cell" aria-hidden="true" />
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className="empty-table">
                    <Database size={24} />
                    <strong>{t("noData")}</strong>
                    <span>{t("noDataHelp")}</span>
                  </div>
                )}
              </div>

              <div className="data-add-actions">
                <button
                  type="button"
                  className="data-add-action"
                  onClick={addRow}
                >
                  <Plus size={16} />
                  {t("newRow")}
                </button>
              </div>
            </section>

            <aside className="data-side panel">
              <div className="panel-heading compact">
                <div>
                  <h2>{t("variables")}</h2>
                </div>
                <span className="count-badge">{fields.length}</span>
              </div>
              <section className="panel-section">
                <p className="section-helper">
                  {t("variableHelp")}
                </p>
                <div className="schema-list">
                  {fields.map((field) => (
                    <div key={field}>
                      <span className="variable-icon">
                        <Type size={15} />
                      </span>
                      <span>
                        <strong>{field}</strong>
                        <small>{`{{${field}}}`}</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(field)}
                        aria-label={t("deleteField", { name: field })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-field-control">
                  <label htmlFor="new-field">{t("newVariable")}</label>
                  <div>
                    <input
                      id="new-field"
                      ref={newFieldInputRef}
                      value={newField}
                      maxLength={MAX_FIELD_LENGTH}
                      onChange={(event) => setNewField(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addField();
                      }}
                      placeholder={t("employeeNumber")}
                    />
                    <button
                      type="button"
                      onClick={addField}
                      aria-label={t("addVariable")}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel-section csv-guide">
                <span className="guide-icon">
                  <FileSpreadsheet size={19} />
                </span>
                <div>
                  <strong>{t("csvExample")}</strong>
                  <code>{localizedSampleData.fields.join(",")}</code>
                  <code>
                    {localizedSampleData.fields
                      .map(
                        (field) =>
                          localizedSampleData.rows[0]?.[field] || "",
                      )
                      .join(",")}
                  </code>
                </div>
              </section>

              <button
                type="button"
                className="secondary-button full-width"
                onClick={() => {
                  rememberData(true);
                  const currentVariableElements = elementsRef.current.filter(
                    (element): element is TextElement =>
                      element.type === "text" && element.kind === "variable",
                  );
                  const fieldMap = new Map(
                    fields.map((field, index) => [
                      field,
                      localizedSampleData.fields[index],
                    ]),
                  );
                  const nextElements = elementsRef.current.map((element) => {
                    if (
                      element.type !== "text" ||
                      element.kind !== "variable" ||
                      !element.field
                    ) {
                      return element;
                    }
                    const nextField = fieldMap.get(element.field);
                    return nextField
                      ? {
                          ...element,
                          field: nextField,
                          name:
                            currentVariableElements.find(
                              (item) => item.id === element.id,
                            )?.name === `${element.field} ${t("textElements")}`
                              ? `${nextField} ${t("textElements")}`
                              : element.name,
                        }
                      : element;
                  });
                  elementsRef.current = nextElements;
                  fieldsRef.current = localizedSampleData.fields;
                  rowsRef.current = localizedSampleData.rows;
                  setElements(nextElements);
                  setFields(localizedSampleData.fields);
                  setRows(localizedSampleData.rows);
                  setSelectedRowId(localizedSampleData.rows[0].id);
                  setToast(t("toastSampleData"));
                }}
              >
                {t("fillSample")}
              </button>

            </aside>
          </div>
        )}

        {mode === "print" && (
          <div className="print-workspace">
            <section className="print-preview-section">
              <div className="workspace-heading print-heading">
                <div>
                  <h1>{t("printPreview")}</h1>
                  <p>{t("printHelp")}</p>
                </div>
                <div className="print-stats">
                  <span>
                    <strong>{recordsPerPage}</strong>
                    {t("perPage")}
                  </span>
                  <span>
                    <strong>{pageCount}</strong>
                    {t("page")}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-button mobile-print-settings-trigger"
                  onClick={() => setIsPrintSettingsOpen(true)}
                  aria-controls="print-settings-panel"
                  aria-expanded={isPrintSettingsOpen}
                >
                  <SlidersHorizontal size={17} aria-hidden="true" />
                  {t("outputSettings")}
                </button>
              </div>

              <div className="print-preview-area">
                <div
                  className="page-preview"
                  style={
                    {
                      "--page-ratio": `${page.width} / ${page.height}`,
                    } as CSSProperties
                  }
                >
                  {layout.fits &&
                    outputMode === "standard" &&
                    previewRows.map((row, index) => {
                      const column = index % layout.columns;
                      const rowIndex = Math.floor(index / layout.columns);
                      const x =
                        layout.startX +
                        column * (badgeWidth + page.gapX);
                      const y =
                        layout.startY +
                        rowIndex * (badgeHeight + page.gapY);
                      return (
                        <div
                          className={`page-badge ${page.showOutline ? "with-outline" : ""}`}
                          key={row.id}
                          style={{
                            left: `${(x / page.width) * 100}%`,
                            top: `${(y / page.height) * 100}%`,
                            width: `${(badgeWidth / page.width) * 100}%`,
                            height: `${(badgeHeight / page.height) * 100}%`,
                          }}
                        >
                          <BadgeContents
                            badgeWidth={badgeWidth}
                            badgeHeight={badgeHeight}
                            backgroundColor={backgroundColor}
                            background={background}
                            backgroundFit={backgroundFit}
                            elements={elements}
                            row={row}
                            t={t}
                          />
                          {page.showCropMarks && (
                            <PreviewCropMarks
                              badgeWidth={badgeWidth}
                              badgeHeight={badgeHeight}
                            />
                          )}
                        </div>
                      );
                    })}
                  {layout.fits &&
                    outputMode === "table-tent" &&
                    rows[currentPreviewPage] && (
                    <>
                      <div
                        className="page-badge table-tent-panel is-reversed"
                        style={{
                          left: "0%",
                          top: "0%",
                          width: "100%",
                          height: "50%",
                        }}
                      >
                        <BadgeContents
                          badgeWidth={badgeWidth}
                          badgeHeight={badgeHeight}
                          backgroundColor={backgroundColor}
                          background={background}
                          backgroundFit={backgroundFit}
                          elements={elements}
                          row={rows[currentPreviewPage]}
                          t={t}
                        />
                      </div>
                      <div
                        className="page-badge table-tent-panel"
                        style={{
                          left: "0%",
                          top: "50%",
                          width: "100%",
                          height: "50%",
                        }}
                      >
                        <BadgeContents
                          badgeWidth={badgeWidth}
                          badgeHeight={badgeHeight}
                          backgroundColor={backgroundColor}
                          background={background}
                          backgroundFit={backgroundFit}
                          elements={elements}
                          row={rows[currentPreviewPage]}
                          t={t}
                        />
                      </div>
                      <span className="fold-guide" aria-hidden="true">
                        <span>{t("foldLine")}</span>
                      </span>
                    </>
                  )}
                  {!layout.fits && (
                    <div className="page-error">
                      <strong>{t("badgeTooLarge")}</strong>
                      <span>{t("badgeTooLargeHelp")}</span>
                    </div>
                  )}
                </div>
                <div className="page-caption">
                  {pageCount > 1 ? (
                    <nav
                      className="preview-pagination"
                      aria-label={t("previewPagination")}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPageIndex((current) =>
                            Math.max(0, current - 1),
                          )
                        }
                        disabled={currentPreviewPage === 0}
                        aria-label={t("previousPage")}
                      >
                        <ChevronLeft size={18} aria-hidden="true" />
                      </button>
                      <span aria-live="polite">
                        <strong>{currentPreviewPage + 1}</strong> / {pageCount}{" "}
                        {t("page")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPageIndex((current) =>
                            Math.min(pageCount - 1, current + 1),
                          )
                        }
                        disabled={currentPreviewPage >= pageCount - 1}
                        aria-label={t("nextPage")}
                      >
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </nav>
                  ) : (
                    <span>
                      1 / {pageCount || 1} {t("page")}
                    </span>
                  )}
                  <strong>
                    {displayNumber(page.width)} × {displayNumber(page.height)} mm
                  </strong>
                </div>
              </div>
            </section>

            <button
              type="button"
              className={`print-settings-scrim ${
                isPrintSettingsOpen ? "is-visible" : ""
              }`}
              onClick={() => setIsPrintSettingsOpen(false)}
              aria-label={t("closeInspectorSheet")}
              aria-hidden={!isPrintSettingsOpen}
              tabIndex={isPrintSettingsOpen ? 0 : -1}
            />

            <aside
              id="print-settings-panel"
              className={`panel print-settings ${
                isPrintSettingsOpen ? "is-open" : ""
              }`}
              aria-label={t("outputSettings")}
            >
              <div className="mobile-print-sheet-header">
                <span className="mobile-print-sheet-handle" aria-hidden="true" />
                <strong>{t("outputSettings")}</strong>
                <button
                  type="button"
                  onClick={() => setIsPrintSettingsOpen(false)}
                  aria-label={t("closeInspectorSheet")}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="print-settings-scroll">
              {outputMode === "table-tent" ? (
                <section className="panel-section table-tent-output">
                  <div className="section-title">
                    <h2>{t("tableTentOutput")}</h2>
                    <span>A4 · 297 × 210 mm</span>
                  </div>
                  <div className="table-tent-diagram" aria-hidden="true">
                    <span>{t("oppositeSide")}</span>
                    <i />
                    <span>{t("frontSide")}</span>
                  </div>
                  <p>{t("tableTentOutputHelp")}</p>
                </section>
              ) : (
                <>
              <section className="panel-section">
                <div className="section-title">
                  <h2>{t("paper")}</h2>
                </div>
                <label className="stacked-field">
                  {t("paperPreset")}
                  <select
                    value={page.preset}
                    onChange={(event) =>
                      setPagePreset(event.target.value as PagePreset)
                    }
                  >
                    {Object.entries(PAGE_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">{t("custom")}</option>
                  </select>
                </label>
                <div className="field-grid two-columns">
                  <label>
                    {t("paperWidth")}
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="50"
                        step="0.1"
                        value={page.width}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            preset: "custom",
                            width: Number(event.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                  <label>
                    {t("paperHeight")}
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="50"
                        step="0.1"
                        value={page.height}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            preset: "custom",
                            height: Number(event.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary-button full-width orientation-swap-button"
                  onClick={() =>
                    setPage((current) => ({
                      ...current,
                      width: current.height,
                      height: current.width,
                    }))
                  }
                >
                  {t("swapOrientation")}
                </button>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>{t("spacing")}</h2>
                  <span>{t("autoCenter")}</span>
                </div>
                <div className="field-grid two-columns">
                  <label>
                    {t("horizontalGap")}
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={page.gapX}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            gapX: Math.max(0, Number(event.target.value)),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                  <label>
                    {t("verticalGap")}
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={page.gapY}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            gapY: Math.max(0, Number(event.target.value)),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                </div>
                <div className="layout-result">
                  <span>
                    {t("gridLayout", {
                      columns: layout.columns,
                      rows: layout.rows,
                    })}
                  </span>
                  <strong>{t("perSheet", { count: layout.capacity })}</strong>
                </div>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>{t("cutDisplay")}</h2>
                </div>
                <label className="switch-row">
                  <span>
                    <strong>{t("outline")}</strong>
                    <small>{t("outlineHelp")}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={page.showOutline}
                    onChange={(event) =>
                      setPage((current) => ({
                        ...current,
                        showOutline: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="switch-row">
                  <span>
                    <strong>{t("cropMarks")}</strong>
                    <small>{t("cropMarksHelp")}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={page.showCropMarks}
                    onChange={(event) =>
                      setPage((current) => ({
                        ...current,
                        showCropMarks: event.target.checked,
                      }))
                    }
                  />
                </label>
              </section>

                </>
              )}

              <section className="panel-section">
                <div className="section-title">
                  <h2>{t("pdfQuality")}</h2>
                </div>
                <label className="stacked-field">
                  {t("resolution")}
                  <select
                    value={dpi}
                    onChange={(event) => setDpi(Number(event.target.value))}
                  >
                    <option value="150">150 DPI · {t("draft")}</option>
                    <option value="300">
                      300 DPI · {t("printRecommended")}
                    </option>
                    <option value="600">600 DPI · {t("highQuality")}</option>
                  </select>
                </label>
              </section>
              </div>

              <div className="export-summary">
                <div>
                  <span>{t("badgeCount", { count: rows.length })}</span>
                  <span>{t("pdfPages", { count: pageCount })}</span>
                </div>
                <button
                  className="primary-button full-width export-button"
                  type="button"
                  onClick={exportPdf}
                  disabled={isExporting || !layout.fits}
                >
                  <Download size={18} />
                  {isExporting
                    ? t("creatingPdf", { progress: exportProgress })
                    : t("downloadPdf")}
                </button>
                <p>{t("printTip", { size: t("actualSize") })}</p>
              </div>
            </aside>
          </div>
        )}
      </main>

      {canvasContextMenu && (
        <div
          ref={canvasContextMenuRef}
          className="canvas-context-menu"
          role="menu"
          aria-label={t("selectionActions")}
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {canvasContextMenu.targetIds.length > 1 &&
            !canvasContextMenu.groupId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => groupElements(canvasContextMenu.targetIds)}
            >
              <Group size={16} aria-hidden="true" />
              {t("groupElements")}
            </button>
          )}
          {canvasContextMenu.groupId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => ungroupElements(canvasContextMenu.groupId)}
            >
              <Ungroup size={16} aria-hidden="true" />
              {t("ungroupElements")}
            </button>
          )}
          {canvasContextMenu.targetIds.length === 1 && (
            <button type="button" role="menuitem" onClick={duplicateSelected}>
              <Copy size={16} aria-hidden="true" />
              {t("duplicate")}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={deleteSelected}
          >
            <Trash2 size={16} aria-hidden="true" />
            {t("delete")}
          </button>
        </div>
      )}

      {isQrDialogOpen && (
        <div className="qr-dialog-overlay">
          <section
            ref={qrDialogRef}
            className="qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
            aria-describedby="qr-dialog-description"
          >
            <header className="qr-dialog-heading">
              <div>
                <span className="qr-dialog-icon" aria-hidden="true">
                  <QrCode size={21} />
                </span>
                <div>
                  <h2 id="qr-dialog-title">{t("generateQrCode")}</h2>
                  <p id="qr-dialog-description">{t("qrDialogDescription")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQrDialog}
                aria-label={t("cancel")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form
              className="qr-dialog-form"
              onSubmit={(event) => {
                event.preventDefault();
                void addQrElement();
              }}
            >
              <label className="stacked-field">
                {t("qrContent")}
                <input
                  ref={qrInputRef}
                  value={newQrValue}
                  maxLength={MAX_CELL_LENGTH}
                  placeholder={t("qrPlaceholder")}
                  onChange={(event) => setNewQrValue(event.target.value)}
                />
              </label>
              <div className="qr-dialog-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeQrDialog}
                >
                  {t("cancel")}
                </button>
                <button type="submit" className="primary-button">
                  <QrCode size={16} aria-hidden="true" />
                  {t("generateQrCode")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {brandCropSession && brandCropPreview && (
        <div className="qr-dialog-overlay brand-crop-overlay">
          <section
            ref={brandCropDialogRef}
            className="brand-crop-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-crop-title"
            aria-describedby="brand-crop-description"
          >
            <header className="qr-dialog-heading">
              <div>
                <span className="qr-dialog-icon" aria-hidden="true">
                  <Crop size={21} />
                </span>
                <div>
                  <h2 id="brand-crop-title">{t("cropBrandLogos")}</h2>
                  <p id="brand-crop-description">{t("cropBrandLogosHelp")}</p>
                </div>
              </div>
              <button
                ref={brandCropCloseRef}
                type="button"
                onClick={() => setBrandCropSession(null)}
                aria-label={t("cancel")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="brand-crop-body">
              <div className="brand-crop-toolbar">
                {!brandCropSession.targetElementId && (
                  <fieldset
                    className="brand-direction-control"
                    aria-label={t("brandBarDirection")}
                  >
                    <button
                      type="button"
                      className={
                        brandCropSession.direction === "horizontal"
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        setBrandCropSession((current) =>
                          current
                            ? { ...current, direction: "horizontal" }
                            : current,
                        )
                      }
                    >
                      <Columns3 size={16} aria-hidden="true" />
                      {t("horizontal")}
                    </button>
                    <button
                      type="button"
                      className={
                        brandCropSession.direction === "vertical"
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        setBrandCropSession((current) =>
                          current
                            ? { ...current, direction: "vertical" }
                            : current,
                        )
                      }
                    >
                      <Rows3 size={16} aria-hidden="true" />
                      {t("vertical")}
                    </button>
                  </fieldset>
                )}
                <span>
                  {brandCropSession.activeIndex + 1} /{" "}
                  {brandCropSession.logos.length}
                </span>
              </div>

              {brandCropSession.logos.length > 1 && (
                <div className="brand-crop-thumbnails">
                  {brandCropSession.logos.map((logo, index) => (
                    <button
                      key={logo.id}
                      type="button"
                      className={
                        index === brandCropSession.activeIndex
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        setBrandCropSession((current) =>
                          current ? { ...current, activeIndex: index } : current,
                        )
                      }
                      aria-label={t("editLogoNumber", { index: index + 1 })}
                      aria-pressed={index === brandCropSession.activeIndex}
                    >
                      <img src={logo.src} alt="" />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="brand-crop-editor">
                <div
                  className="brand-crop-stage"
                  style={{
                    aspectRatio: `${brandCropPreview.slot.width} / ${brandCropPreview.slot.height}`,
                    background: brandCropSession.backgroundColor,
                  }}
                  onPointerDown={handleBrandCropPointerDown}
                  onPointerMove={handleBrandCropPointerMove}
                  onPointerUp={handleBrandCropPointerEnd}
                  onPointerCancel={handleBrandCropPointerEnd}
                >
                  <img
                    src={brandCropPreview.logo.src}
                    alt=""
                    draggable={false}
                    style={getBrandLogoStyle(
                      brandCropPreview.logo,
                      brandCropPreview.slot.width,
                      brandCropPreview.slot.height,
                    )}
                  />
                  <span className="brand-crop-grid" aria-hidden="true" />
                </div>

                <div className="brand-crop-controls">
                  <label>
                    <span>{t("zoom")}</span>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.05"
                      value={brandCropPreview.logo.zoom}
                      onChange={(event) =>
                        updateActiveBrandCrop({
                          zoom: Number(event.target.value),
                        })
                      }
                    />
                    <output>{brandCropPreview.logo.zoom.toFixed(2)}×</output>
                  </label>
                  <label>
                    <span>{t("horizontalPosition")}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={brandCropPreview.logo.cropX}
                      onChange={(event) =>
                        updateActiveBrandCrop({
                          cropX: Number(event.target.value),
                        })
                      }
                    />
                    <output>{Math.round(brandCropPreview.logo.cropX)}%</output>
                  </label>
                  <label>
                    <span>{t("verticalPosition")}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={brandCropPreview.logo.cropY}
                      onChange={(event) =>
                        updateActiveBrandCrop({
                          cropY: Number(event.target.value),
                        })
                      }
                    />
                    <output>{Math.round(brandCropPreview.logo.cropY)}%</output>
                  </label>
                  {!brandCropSession.targetElementId && (
                    <label className="brand-crop-background">
                      <span>{t("backgroundColor")}</span>
                      <input
                        type="color"
                        value={brandCropSession.backgroundColor}
                        onChange={(event) =>
                          setBrandCropSession((current) =>
                            current
                              ? {
                                  ...current,
                                  backgroundColor: event.target.value,
                                }
                              : current,
                          )
                        }
                      />
                      <output>
                        {brandCropSession.backgroundColor.toUpperCase()}
                      </output>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <footer className="brand-crop-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setBrandCropSession(null)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={applyBrandCropSession}
              >
                <Check size={16} aria-hidden="true" />
                {brandCropSession.replaceLogoId
                  ? t("applyCrop")
                  : brandCropSession.targetElementId
                    ? t("addSelectedLogos")
                    : t("addBrandBar")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

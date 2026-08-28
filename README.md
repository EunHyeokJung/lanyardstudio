# LanyardStudio

브라우저에서 명찰을 디자인하고 CSV 데이터를 연결해 실제 크기 인쇄용 PDF를 만드는 오픈소스 도구입니다.

[웹 앱 실행](https://lanyard-studio.com/) · [GitHub 저장소](https://github.com/EunHyeokJung/lanyardstudio) · [최신 릴리스 다운로드](https://github.com/EunHyeokJung/lanyardstudio/releases/latest) · [English README](README.en.md)

![LanyardStudio 미리보기](public/og.png)

## 주요 기능

- 명찰·사원증·A4 반접이 테이블 명패를 mm 단위로 디자인
- 텍스트, 변수, 이미지·SVG, 도형, QR 코드, 여러 로고의 브랜드 바 추가
- 다중 선택·그룹, 복사·붙여넣기, 크기 조절, 중앙 자석 정렬, 레이어 관리
- CSV와 표 편집, 행 선택·일괄 삭제·순서 변경, 변수 추가·이름 변경
- 여러 페이지 인쇄 미리보기와 재단선·외곽선을 포함한 실제 크기 PDF
- 저장된 프로젝트 목록, 이름 변경, 자동 저장, JSON 백업·복원
- 모바일 하단 속성 패널과 태블릿 사이드 패널
- 8개 언어 UI·샘플 데이터 및 설치형 PWA

업로드한 이미지와 CSV는 애플리케이션 서버로 전송하지 않습니다. 디자인, 자동 저장, PDF 생성은 브라우저 안에서 처리됩니다. 방문 통계용 GA4는 배포 설정에 따라 별도로 활성화할 수 있습니다.

## v1.8.0 주요 변경

- 모바일 속성 패널의 스크롤 하단이 내비게이션에 가려지는 문제 수정
- 랜딩의 디자인·명단·인쇄 예시와 규격 카드까지 8개 언어 샘플 적용
- 브랜드 바의 정사각형·세로형 로고를 기본적으로 비율 유지하여 맞춤
- 외부 앱에서 복사한 이미지 붙여넣기와 요소 복사·붙여넣기 개선
- 데이터 행의 체크박스 선택·일괄 삭제·드래그 순서 변경 및 버튼 정렬 개선

전체 이력은 [CHANGELOG.md](CHANGELOG.md), 배포 파일은 [v1.8.0 릴리즈](https://github.com/EunHyeokJung/lanyardstudio/releases/tag/v1.8.0)에서 확인할 수 있습니다.

## 사용 흐름

### 1. 규격 선택

랜딩에서 규격을 선택한 뒤 **이 규격으로 만들기**를 누릅니다. **규격 직접 입력**으로 시작하거나 편집기에서 크기를 변경할 수도 있습니다.

| 기본 규격 | 디자인 크기 |
| --- | --- |
| 목걸이 명찰 · 대형 | 95 × 123 mm |
| A7 행사 명찰 | 74 × 105 mm |
| B7 컨퍼런스 패스 | 91 × 128 mm |
| 사원증 · ID 카드 | 85.6 × 54 mm |
| A4 반접이 테이블 명패 | 한 면 297 × 105 mm · A4 가로 용지를 반접기 |
| 가로 이름표 | 90 × 60 mm |

규격 카드에는 시중 상품 예시도 표시됩니다. 케이스 외경이 아닌 실제 내지 규격을 구매 전 확인하세요.

### 2. 디자인

- **요소 추가:** 제목·본문·캡션, 사각형·원형·선, PNG/JPEG/WebP/SVG, 링크·텍스트 QR 코드
- **텍스트:** 글꼴 계열, 크기, 굵기, 색상, 문단 정렬. 변수 텍스트는 편집 중 `{{사람 이름}}`처럼 표시되고 출력에서 실제 값으로 치환됩니다.
- **배치:** 드래그 이동, 크기 핸들, 회전·불투명도, mm 좌표, 안전 영역, 가로·세로 중앙 정렬과 자석 스냅. 요소를 명찰 경계 밖으로 일부 배치할 수 있습니다.
- **그룹·레이어:** Ctrl/Cmd/Shift를 누른 채 여러 요소를 선택하고 우클릭 메뉴에서 그룹·그룹 해제. 이름 변경, 순서, 보기·숨김, 잠금, 복제, 삭제를 지원합니다.
- **변수:** 연결된 텍스트 요소 조회, 변수 이름 변경, 변수에서 바로 캔버스 요소 추가
- **브랜드 바:** 여러 로고를 불러와 개별 크롭·확대·순서 변경 후 가로 또는 세로로 균등 배치. 띠 전체의 크기·위치·배경색·여백·간격을 조절할 수 있습니다. 로고는 기본적으로 비율을 유지해 맞춥니다.

요소 선택 시 속성 편집 화면으로 전환됩니다. 태블릿에서는 사이드 패널, 모바일에서는 핸들로 접기·반열기·펼치기가 가능한 하단 패널을 사용합니다.

### 3. 명단 연결

CSV를 업로드하거나 표에서 직접 입력합니다. 한 행은 한 사람, 열 이름은 디자인에 연결할 변수입니다.

- 표 하단에서 새 행, 우측 끝에서 새 열(변수) 추가
- 체크박스로 여러 행을 선택해 일괄 삭제
- 행 핸들로 순서 변경. 핸들에 포커스를 두고 위·아래 방향키로도 이동
- 데이터 편집 실행 취소·다시 실행
- **예시 데이터 채우기**로 현재 언어의 샘플 명단 적용 — 현재 명단을 교체하므로 필요한 데이터는 먼저 백업하세요.

한국어 CSV 예시:

```csv
사람 이름,팀,직책
김민지,브랜드팀,디자이너
박준호,제품팀,프로덕트 매니저
```

### 4. 미리보기와 출력

A3·A4·Letter 또는 사용자 지정 용지, 방향, 가로·세로 간격을 설정합니다. 명찰은 용지 중앙에 자동 배치되고, 여러 페이지는 미리보기의 이전·다음 버튼으로 확인할 수 있습니다. 외곽선과 재단선을 개별 설정하고 150·300·600 DPI PDF를 생성합니다. A4 반접이 명패는 같은 이름이 앞뒤에서 보이도록 두 면을 배치합니다.

인쇄 시 **실제 크기 / 100%**를 선택하세요. 프린터의 인쇄 가능 영역은 기기마다 다르므로 대량 출력 전 한 장을 테스트하는 것이 좋습니다.

## 프로젝트 저장과 단축키

랜딩의 **저장된 프로젝트 이어하기**에서 프로젝트 목록을 열 수 있습니다. 목록과 편집기 상단에서 이름을 변경할 수 있으며, 디자인·이미지·명단은 자동 저장됩니다. **백업**으로 `.lanyardstudio.json` 파일을 내보내고 **불러오기**로 복원합니다.

저장소는 해당 브라우저와 사이트 주소에 종속됩니다. 다른 브라우저·기기·도메인으로 자동 동기화되지 않으며 사이트 데이터 삭제 시 사라질 수 있으므로 JSON 백업을 권장합니다.

| 동작 | 단축키 |
| --- | --- |
| 실행 취소 | Ctrl/Cmd + Z |
| 다시 실행 | Ctrl/Cmd + Shift + Z 또는 Ctrl/Cmd + Y |
| 선택 요소 복사·붙여넣기 | Ctrl/Cmd + C / V |
| 외부 이미지 붙여넣기 | 이미지 데이터가 클립보드에 있는 상태에서 Ctrl/Cmd + V |
| 선택 요소 삭제 | Backspace 또는 Delete |
| 요소 이동 | 방향키 · 0.5 mm, Shift + 방향키 · 2 mm |
| 다중 선택 | Ctrl/Cmd/Shift + 요소 클릭 |

요소 단축키는 디자인 화면에서 사용합니다. 텍스트 입력창의 일반 복사·붙여넣기는 유지됩니다. 외부 이미지 붙여넣기는 브라우저와 원본 앱이 제공하는 클립보드 형식에 따라 달라질 수 있습니다.

## 앱 설치

LanyardStudio는 별도 앱 스토어 없이 설치하는 PWA입니다.

1. [LanyardStudio 웹 앱](https://lanyard-studio.com/)을 Chrome, Edge 또는 Safari로 엽니다.
2. 상단의 **앱 설치**를 누릅니다. 버튼이 보이지 않으면 브라우저 메뉴의 **앱 설치** 또는 **홈 화면에 추가**를 선택합니다.
3. 설치 후에는 앱 창과 홈 화면 아이콘으로 실행할 수 있으며, 한 번 연 화면은 네트워크가 불안정해도 다시 열 수 있습니다.

한국어, English, 日本語, 简体中文, 繁體中文, Español, Français, Deutsch를 지원합니다. 언어는 상단 메뉴에서 변경할 수 있고 번역이 없는 문구는 영어로 폴백합니다. 랜딩 예시, 새 프로젝트의 기본 명단, **예시 데이터 채우기**는 선택 언어를 사용합니다. 기존 프로젝트의 CSV 열 이름, 입력된 명단과 텍스트는 언어 변경만으로 수정하지 않습니다.

### 릴리즈 다운로드

[최신 릴리즈](https://github.com/EunHyeokJung/lanyardstudio/releases/latest)에서 소스 코드와 `lanyardstudio-v1.8.0-web.zip` 정적 빌드를 받을 수 있습니다. ZIP에는 애플리케이션 서버 없이 호스팅할 수 있는 `web/` 파일과 실행 안내가 들어 있습니다. 재배포용 빌드에는 운영자의 GA 측정 ID를 포함하지 않습니다.

현재 배포 형식은 PWA와 정적 웹 빌드이며 `.dmg`, `.exe`, `.apk` 설치 파일은 제공하지 않습니다. 정적 파일을 더블클릭하는 대신 HTTP 서버 또는 HTTPS 호스팅으로 실행하세요. 자세한 방법은 [정적 빌드 실행 안내](docs/STATIC_BUILD.md)를 참고하세요.

## 빠른 시작

요구 사항:

- Node.js 22.13 이상
- npm 10 이상

```bash
git clone https://github.com/EunHyeokJung/lanyardstudio.git
cd lanyardstudio
npm ci
npm run dev
```

개발 서버가 출력한 로컬 주소를 브라우저에서 여세요.

## 명령어

```bash
npm run dev        # 로컬 개발 서버
npm run lint       # Biome 정적 분석
npm run typecheck  # TypeScript 검사
npm test           # 프로덕션 빌드 + 렌더링 통합 테스트
npm run check      # lint + typecheck + test
npm run build      # 프로덕션 빌드
npm run build:pages # GitHub Pages용 정적 export
npm run build:cloudflare-pages # Cloudflare Pages용 정적 export
npm run start      # 빌드 결과 로컬 실행
```

## 지원 범위와 안전 제한

| 항목 | 지원 및 제한 |
| --- | --- |
| 이미지 | PNG, JPEG, WebP, SVG · 파일당 최대 10MB |
| 브랜드 바 | 요소당 로고 최대 24개 · 전체 이미지 데이터 최대 24MB |
| 디자인 요소 | 프로젝트당 최대 200개 |
| CSV | UTF-8 권장 · 최대 5MB, 500행, 50열 |
| 프로젝트 | `.lanyardstudio.json` · 최대 30MB |
| PDF | 150, 300, 600 DPI |
| 저장 | IndexedDB 우선, localStorage 폴백 |

SVG는 스크립트, 외부 리소스 참조, 위험한 CSS를 제거한 뒤 사용합니다. 프로젝트 import도 허용된 데이터 URL과 유효한 수치 범위만 받아들입니다.

## 구조

```text
app/                 Next.js App Router, 메타데이터, 오류 화면
components/          LanyardStudio 편집기 UI와 PDF 렌더링
lib/lanyardstudio/   브라우저 저장소 어댑터와 자동 마이그레이션
worker/              Cloudflare Worker 엔트리와 보안 헤더
tests/               서버 렌더링 및 배포 계약 테스트
docs/                아키텍처 문서
```

상세한 데이터 흐름과 신뢰 경계는 [아키텍처 문서](docs/ARCHITECTURE.md), 번역 추가 방법은 [다국어 가이드](docs/I18N.md), [분석 설정 가이드](docs/ANALYTICS.md), 대표 규격에 표시되는 시중 상품의 근거는 [상품 규격 출처](docs/PRESET_PRODUCT_SOURCES.md)를 참고하세요.

## 배포

공식 프로덕션은 `main` 브랜치에서 정적 export한 뒤 [Cloudflare Pages](https://lanyard-studio.com/)로 자동 배포합니다. 이전 주소인 `lanyardstudio.silverhyeok.dev`는 `legacy-site/`의 다국어 이전 안내 페이지를 제공합니다. GitHub Pages 배포도 미러로 유지하며, vinext 빌드는 Cloudflare Worker 호환 여부를 검증하는 용도로 사용합니다.

```bash
npm ci
npm run check
npm run build:cloudflare-pages
```

GitHub Pages용으로 배포할 경우 마지막 명령 대신 `npm run build:pages`를 사용합니다. 이 빌드는 `/lanyardstudio/` base path를 적용해 PWA manifest, 아이콘, 서비스 워커까지 하위 경로에서 동작합니다. 플랫폼별 비밀 값은 저장소에 커밋하지 마세요.

Cloudflare Pages에서는 빌드 명령을 `npm run build:cloudflare-pages`, 출력 디렉터리를 `out`으로 설정합니다. GA4를 사용하려면 같은 웹 스트림의 `NEXT_PUBLIC_GA_MEASUREMENT_ID`를 빌드 환경변수로 등록하세요. 값이 없으면 분석 스크립트는 출력되지 않습니다.

이전 안내 사이트는 `npm run deploy:moved-site`로 별도의 Cloudflare Pages 프로젝트에 배포합니다.

## 기여

버그 수정과 기능 제안을 환영합니다. 작업 전 [기여 가이드](CONTRIBUTING.md), [행동 강령](CODE_OF_CONDUCT.md), [보안 정책](SECURITY.md)을 읽어 주세요.

## 라이선스

[MIT](LICENSE) © EunHyeokJung

# LanyardStudio static web build

The `lanyardstudio-v1.8.0-web.zip` release asset contains a ready-to-host static application, this guide, and the MIT license. It is not a native desktop or mobile installer. To install the PWA without hosting anything, open [lanyard-studio.com](https://lanyard-studio.com/) and use **Install app**.

## Run locally

Extract the ZIP. From the extracted `lanyardstudio-v1.8.0-web` directory, run a local static server. For example, with Python 3 installed:

```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory web
```

Then open [http://localhost:8080](http://localhost:8080). Do not open `web/index.html` directly with `file://`; application scripts and service workers require an HTTP origin. Keep the server running while using the application.

## Host publicly

Upload the contents of `web/` to the root of an HTTPS static host, such as Cloudflare Pages. The download is built for `/`; hosting under a subdirectory requires a source build with the matching base path. HTTPS is required for PWA installation on public domains.

The archive has no application backend, account system, cloud project synchronization, or production GA measurement ID. Projects are saved in the current browser for that origin. Use JSON backups to move them between origins or devices.

The prebuilt site's canonical and social-preview URLs point to the official domain. For your own domain or analytics, build from source with the appropriate settings instead of editing generated files:

```bash
npm ci
STATIC_EXPORT=true NEXT_PUBLIC_SITE_URL=https://your-domain.example/ NEXT_PUBLIC_GA_MEASUREMENT_ID= npm exec -- next build
```

The result is in `out/`. Set `NEXT_PUBLIC_BASE_PATH` when serving below a subdirectory. Optional analytics configuration is documented in the source repository's `docs/ANALYTICS.md`.

## Verify the download

Download `SHA256SUMS` alongside the ZIP and run in the same directory:

```bash
shasum -a 256 -c SHA256SUMS
```

Linux systems can use `sha256sum -c SHA256SUMS` instead.

## 한국어 안내

- 일반 사용자는 [웹 앱](https://lanyard-studio.com/)에서 **앱 설치**를 사용하면 됩니다.
- ZIP은 자체 호스팅용 정적 파일입니다. 압축을 풀고 위 명령으로 `web/`을 HTTP 서버에서 제공하거나 HTTPS 호스팅 루트에 업로드하세요.
- `.dmg`, `.exe`, `.apk` 설치 파일이 아니며 `index.html` 더블클릭 실행은 지원하지 않습니다.
- 프로젝트는 브라우저·사이트 주소별로 저장되며 자동 동기화되지 않습니다. 중요한 프로젝트는 JSON으로 백업하세요.
- 다운로드 빌드에는 운영자의 GA 측정 ID가 없습니다. 도메인·분석 설정을 변경하려면 소스에서 다시 빌드하세요.

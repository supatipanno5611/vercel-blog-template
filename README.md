# vercel blog template

Next.js 기반 Markdown 블로그 템플릿입니다. 한국어 검색, 토픽 탐색, Obsidian 스타일 Markdown 확장 문법, 오디오/영상 노트 기능을 지원합니다.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Velite for Markdown content
- MiniSearch + es-hangul for Korean search
- lite-youtube-embed for YouTube notes

## Getting Started

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

## Content

Markdown-only `.md` files live directly under `content/`.

```txt
content/
├── home.md
├── 사용 안내.md
├── 새 글.md
└── notes/
    └── 하위 폴더 글.md
```

The file path becomes the URL path. Spaces are converted to hyphens.

- `content/새 글.md` -> `/새-글`
- `content/notes/하위 폴더 글.md` -> `/notes/하위-폴더-글`

The file name is used as the post title.

```md
---
draft: false
base: [Next.js, MD]
---

본문...
```

## Markdown Features

Wiki links:

```md
[[사용 안내]]
[[사용 안내|가이드]]
```

Highlight:

```md
==highlighted text==
```

Callouts:

```md
> [!note] Title
> Content
```

YouTube:

```md
---
media: youtube
---

::youtube{id="VIDEO_ID"}
```

Audio:

```md
---
media: audio
---

::audio{src="https://example.com/audio.mp3"}
```

Raw HTML, JSX, JavaScript expressions, and `import`/`export` are not supported in content files.

Chapters:

```md
## 0:00 Intro
## 1:30 Main section
```

Cues:

```md
▶ 0:05 This paragraph is tied to the media timestamp.
```

## Search And Topics

- Global search opens with `Ctrl+/`.
- Search index is served from `/search-index.json`.
- `base` frontmatter values become topics.
- Topic pages are available at `/topics/[topic]`.
- Wiki links power the backlinks section on post pages.

## Content Doctor

```bash
npm run content:check
npm run content:fix
```

`check` reports missing `base`, suspicious title/slug issues, broken wiki links, and media directive mismatches. `fix` only applies safe automatic fixes such as adding missing `base` or adding `media` when exactly one media directive exists.

## Configuration

Customize site metadata, excluded pages, footer links, and recent topic sources in `site.config.ts`.

Customize colors and UI tokens in `app/globals.css`.

## License

MIT

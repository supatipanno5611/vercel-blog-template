# Blog Template 사용 설명서

Markdown 파일로 글을 쓰고, Next.js와 Vercel로 공개 웹사이트를 만드는 블로그 템플릿입니다.

이 문서는 컴퓨터를 잘 모르는 사람도 따라 할 수 있도록, 처음 설치부터 글 작성, 사용자 설정, 배포까지 순서대로 설명합니다.

## 이 프로젝트가 하는 일

- `content` 폴더에 있는 Markdown 글을 웹사이트 글로 보여 줍니다.
- 파일명으로 글 제목과 주소를 만듭니다.
- 글 본문, 제목, 주제어를 검색할 수 있습니다.
- `[[다른 글]]`처럼 쓴 위키 링크를 내부 링크로 바꿉니다.
- YouTube 영상이나 오디오 파일을 글 위에 붙일 수 있습니다.
- 시간표가 있는 글에서는 챕터와 cue 버튼으로 원하는 재생 위치로 이동할 수 있습니다.
- 일상 노트 전용 화면을 제공합니다.
- Obsidian 같은 다른 글쓰기 폴더에서 공개할 Markdown 파일만 복사해 올 수 있습니다.

## 준비물

처음 한 번만 준비하면 됩니다.

1. Node.js를 설치합니다.
   - 권장: 최신 LTS 버전 또는 이 프로젝트에서 쓰는 Next.js 16을 실행할 수 있는 최신 Node.js
   - 확인 명령:

```powershell
node -v
npm -v
```

2. 이 프로젝트 폴더에서 필요한 프로그램을 설치합니다.

```powershell
npm install
```

3. 사이트 설정을 확인합니다.

설정 파일은 `site.config.ts`입니다. 이 파일을 열어서 본인 사이트에 맞게 고칩니다.

## 처음 실행하기

프로젝트 폴더에서 아래 명령을 실행합니다.

```powershell
npm run dev
```

터미널에 `http://localhost:3000` 같은 주소가 나오면, 웹브라우저에서 그 주소를 엽니다.

개발 서버를 끄려면 터미널에서 `Ctrl + C`를 누릅니다.

## 자주 쓰는 명령어

| 명령어 | 언제 쓰나요 |
| --- | --- |
| `npm run dev` | 내 컴퓨터에서 사이트를 미리 볼 때 |
| `npm run build` | 배포 전에 실제로 빌드가 되는지 확인할 때 |
| `npm run start` | `npm run build` 후 완성된 사이트를 실행할 때 |
| `npm run lint` | 코드 문법과 React 규칙을 검사할 때 |
| `npm run content:check` | 글 파일의 frontmatter, 링크, 주제어, 날짜 등을 검사할 때 |
| `npm run content:fix` | 고칠 수 있는 글 문제를 자동 수정할 때 |
| `npm run content:unwrap` | Markdown 문단의 불필요한 줄바꿈을 정리할 때 |
| `npm run sync` | 외부 글쓰기 폴더에서 `content`로 Markdown 파일을 복사할 때 |
| `npm run sync -- --check` | 실제 복사 없이 무엇이 바뀔지 확인할 때 |
| `npm run sync -- --yes` | 묻지 않고 바로 복사/삭제를 적용할 때 |

## 사용자 설정 파일

사이트의 중요한 사용자 설정은 `site.config.ts`에 모여 있습니다.

현재 기본 모양은 아래와 같습니다.

```ts
export const siteConfig = {
  title: '',
  description: '',
  lang: 'ko',
  VAULT_PUBLISH: '',
  homeSlug: '홈',
  enableOrdinaryNotes: true,
  curatedTopicSourceTitles: [] as string[],
  contentDoctor: {
    ignoreFiles: [] as string[],
    ignoreRulesBySlug: {} as Record<string, string[]>,
    ignoreRulesByFile: {} as Record<string, string[]>,
  },
}
```

### `title`

사이트 이름입니다.

예:

```ts
title: '나의 기록 창고',
```

브라우저 탭 제목이나 사이트 헤더에서 사용됩니다. 비워 두면 사이트 이름이 없는 상태가 됩니다.

### `description`

사이트 설명입니다.

예:

```ts
description: '공부 기록과 일상 노트를 모아 둔 개인 블로그',
```

검색엔진, 공유 미리보기, 사이트 설명에 사용할 수 있는 짧은 문장입니다.

### `lang`

사이트 언어입니다.

한국어 사이트라면 보통 그대로 둡니다.

```ts
lang: 'ko',
```

영어 사이트라면 아래처럼 바꿀 수 있습니다.

```ts
lang: 'en',
```

### `VAULT_PUBLISH`

가장 중요한 설정입니다.

Obsidian 같은 글쓰기 폴더에서 공개할 Markdown 파일을 따로 모아 둔 폴더의 절대 경로를 적습니다. `npm run sync`는 이 폴더의 Markdown 파일을 프로젝트의 `content` 폴더로 복사합니다.

Windows 예:

```ts
VAULT_PUBLISH: 'C:/Users/your-name/Documents/blog-publish',
```

macOS 예:

```ts
VAULT_PUBLISH: '/Users/your-name/Documents/blog-publish',
```

중요한 점:

- 이 경로는 내 컴퓨터에 있는 폴더입니다.
- Vercel은 이 폴더를 직접 읽을 수 없습니다.
- 배포하려면 먼저 `npm run sync`로 글을 `content` 폴더에 복사하고, 그 변경사항을 Git에 올려야 합니다.
- 경로에는 역슬래시 `\` 대신 슬래시 `/`를 쓰는 편이 안전합니다.
- `VAULT_PUBLISH`가 비어 있으면 `npm run sync`가 실패합니다.

환경변수로 임시 지정할 수도 있습니다.

```powershell
$env:VAULT_PUBLISH='C:/Users/your-name/Documents/blog-publish'
npm run sync -- --check
```

환경변수로 지정한 값은 `site.config.ts`보다 우선합니다.

### `homeSlug`

첫 화면으로 사용할 Markdown 파일 이름입니다.

기본값:

```ts
homeSlug: '홈',
```

이 설정이면 `content/홈.md`가 홈페이지 본문으로 사용됩니다.

예를 들어 홈페이지 파일을 `content/처음.md`로 바꾸고 싶다면:

```ts
homeSlug: '처음',
```

그리고 `content/처음.md` 파일이 실제로 있어야 합니다.

### `enableOrdinaryNotes`

일상 노트 기능을 켜거나 끕니다.

```ts
enableOrdinaryNotes: true,
```

`true`이면:

- `/ordinary` 화면이 열립니다.
- 월별 일상 노트 화면이 생깁니다.
- 홈페이지에서 오늘의 일상 노트 링크를 보여 줄 수 있습니다.
- 검색, 주제어, 관련 글에서 일상 노트가 발견됩니다.

`false`이면:

- 일상 노트 화면을 숨깁니다.
- 일상 노트 직접 주소도 열리지 않습니다.
- 검색과 주제어 같은 내부 발견 경로에서도 일상 노트를 제외합니다.

일상 노트를 쓰지 않는 사이트라면 `false`로 바꿔도 됩니다.

### `curatedTopicSourceTitles`

주제어 탐색 화면에서 추천 주제어를 만들 때 참고할 글 제목 목록입니다.

예:

```ts
curatedTopicSourceTitles: [
  '기능 예제 모음',
  '내가 자주 쓰는 글쓰기 규칙',
],
```

주의할 점:

- 여기에는 파일명이 아니라 화면에 보이는 글 제목을 적습니다.
- 파일명 앞의 `00 ` 같은 정렬용 숫자는 제목에서 빠질 수 있습니다.
- 비워 두면 자동으로 전체 주제어를 중심으로 보여 줍니다.

### `contentDoctor`

`npm run content:check`와 `npm run content:fix`가 글을 검사할 때 예외를 줄 수 있는 설정입니다.

보통은 건드리지 않아도 됩니다. 특별한 글만 검사 규칙에서 빼고 싶을 때 사용합니다.

```ts
contentDoctor: {
  ignoreFiles: [] as string[],
  ignoreRulesBySlug: {} as Record<string, string[]>,
  ignoreRulesByFile: {} as Record<string, string[]>,
},
```

사용할 수 있는 규칙 이름:

- `topics`: 주제어 검사
- `titleSlug`: 제목, 주소, 부모 글, 순서 검사
- `wikiLinks`: 깨진 위키 링크 검사
- `media`: YouTube와 오디오 설정 검사
- `encoding`: 깨진 글자와 보이지 않는 문자 검사

특정 파일 전체를 검사에서 제외하는 예:

```ts
contentDoctor: {
  ignoreFiles: ['임시/아직-정리중'],
  ignoreRulesBySlug: {},
  ignoreRulesByFile: {},
},
```

특정 글에서 주제어 검사만 제외하는 예:

```ts
contentDoctor: {
  ignoreFiles: [],
  ignoreRulesBySlug: {
    '임시-글': ['topics'],
  },
  ignoreRulesByFile: {},
},
```

파일 경로 기준으로 특정 규칙만 제외하는 예:

```ts
contentDoctor: {
  ignoreFiles: [],
  ignoreRulesBySlug: {},
  ignoreRulesByFile: {
    '임시/아직-정리중': ['topics', 'wikiLinks'],
  },
},
```

처음에는 예외를 만들기보다, 검사 결과가 알려 주는 문제를 고치는 편이 좋습니다.

## 글은 어디에 쓰나요

웹사이트에 보일 글은 `content` 폴더 안에 `.md` 파일로 둡니다.

예:

```text
content/
  홈.md
  공부/
    01 첫 번째 글.md
    02 두 번째 글.md
  ordinary/
    2026-05-25 일상 노트.md
```

파일명 규칙:

- 파일명이 글 제목이 됩니다.
- 공백은 주소에서 `-`로 바뀝니다.
- 앞에 붙인 `01 ` 같은 숫자는 화면 제목과 주소에서 빠집니다.
- 같은 주소가 되는 파일이 두 개 있으면 빌드가 실패합니다.

## 기본 글 작성법

일반 글은 보통 아래처럼 시작합니다.

```md
---
date: 2026-05-28
topics:
  - 공부
  - 기록
---

여기에 본문을 씁니다.
```

### `date`

공개 글의 날짜입니다.

형식은 반드시 `YYYY-MM-DD`입니다.

좋은 예:

```md
date: 2026-05-28
```

나쁜 예:

```md
date: 2026.05.28
date: 2026/05/28
date: 오늘
```

홈페이지 글, 홈 링크용 글, `type: index` 글은 날짜가 필요하지 않습니다. 일반 읽기 글에는 날짜가 필요합니다.

### `topics`

글의 주제어입니다.

```md
topics:
  - Next.js
  - Markdown
```

일반 글에는 `topics`가 필요합니다. 주제어가 아직 없다면 빈 배열로 둘 수 있습니다.

```md
topics: []
```

### `type: index`

여러 하위 글을 묶는 목차 글입니다.

```md
---
type: index
---

이 글은 여러 글을 묶는 첫 화면입니다.
```

`type: index` 글은:

- `date`가 없어도 됩니다.
- `topics`를 쓰면 안 됩니다.
- `parent`를 쓰면 안 됩니다.
- `order`를 쓰면 안 됩니다.

사이트에 `type: index` 글이 하나라도 있으면 홈페이지 아래쪽에 목차 목록으로 가는 링크가 생기고, `/indexes` 화면에서 모든 목차 글을 볼 수 있습니다.

### `parent`와 `order`

어떤 글을 목차 글 아래에 넣고 싶을 때 사용합니다.

목차 글:

```text
content/예제/00 기능 예제 모음.md
```

하위 글:

```md
---
date: 2026-05-28
parent: 예제/00 기능 예제 모음
order: 1
topics:
  - 기능 예제
---

본문입니다.
```

중요한 점:

- `parent`에는 `content` 기준의 파일 경로를 씁니다.
- `.md` 확장자는 쓰지 않습니다.
- `parent`가 있으면 `order`도 반드시 있어야 합니다.
- `order`는 1 이상의 정수입니다.
- 같은 `parent` 아래에서 같은 `order`를 두 번 쓰면 안 됩니다.
- `parent`가 가리키는 글은 `type: index` 글이어야 합니다.

## 내부 링크 쓰기

다른 글로 연결하려면 위키 링크를 씁니다.

```md
[[예제/Markdown과 글 연결]]
```

화면에 보이는 이름을 다르게 하고 싶다면:

```md
[[예제/Markdown과 글 연결|Markdown 예제]]
```

주의할 점:

- 링크 대상은 실제로 존재해야 합니다.
- `npm run content:check`가 깨진 링크를 찾아 줍니다.
- 링크를 받은 글의 하단에는 백링크가 표시됩니다.

## 강조와 알림 상자

강조 표시:

```md
==중요한 문장==
```

알림 상자:

```md
> [!note] 제목
> 내용입니다.
```

사용할 수 있는 예:

```md
> [!tip] 팁
> 이렇게 쓰면 팁 상자로 보입니다.
```

## YouTube 글 작성

YouTube 영상을 글에 붙이려면 frontmatter에 `youtubeId`를 적습니다.

```md
---
date: 2026-05-28
topics:
  - 영상
youtubeId: M7lc1UVf-VE
---

영상 설명을 씁니다.
```

중요한 점:

- YouTube 주소 전체가 아니라 영상 ID 11자만 씁니다.
- `youtubeId`와 `audioSrc`는 한 글에서 함께 쓸 수 없습니다.
- 예전 방식인 `::youtube` directive는 더 이상 지원하지 않습니다.

YouTube 주소가 아래와 같다면:

```text
https://www.youtube.com/watch?v=M7lc1UVf-VE
```

적을 값은 이것입니다.

```md
youtubeId: M7lc1UVf-VE
```

## 오디오 글 작성

오디오를 붙이려면 `audioSrc`와 `audioTitle`을 함께 적습니다.

```md
---
date: 2026-05-28
topics:
  - 오디오
audioSrc: https://example.com/audio.mp3
audioTitle: 인터뷰 녹음
---

오디오 설명을 씁니다.
```

중요한 점:

- `audioSrc`는 `/audio/file.mp3` 같은 사이트 내부 경로이거나 `https://` 주소여야 합니다.
- `audioSrc`를 쓰면 `audioTitle`도 반드시 필요합니다.
- `audioTitle`만 단독으로 쓰면 오류입니다.
- `audioSrc`와 `youtubeId`는 함께 쓸 수 없습니다.

## 챕터와 cue

영상이나 오디오 글에서 시간 이동 버튼을 만들 수 있습니다.

챕터는 `##` 제목으로 씁니다.

```md
## 00:00 시작
```

cue는 문단 맨 앞에 `▶ 시간`을 붙입니다.

```md
▶ 00:05 이 버튼을 누르면 5초 위치로 이동합니다.
```

예:

```md
## 00:00 시작

▶ 00:00 첫 번째 설명입니다.

▶ 00:10 두 번째 설명입니다.

## 01:00 핵심 부분

▶ 01:00 핵심 설명입니다.
```

주의할 점:

- 챕터는 `## 00:00 제목` 형식이어야 합니다.
- cue는 줄 맨 앞에 `▶ 00:00`처럼 써야 합니다.
- 시간은 `00:05`, `01:30`, `1:02:03` 같은 형식을 사용할 수 있습니다.
- 미디어가 없는 일반 글에서는 본문 목차가 보이고, 미디어 글에서는 챕터 메뉴가 중심이 됩니다.

## 일상 노트

일상 노트는 `content/ordinary` 바로 아래에 둡니다.

```text
content/ordinary/2026-05-28 오늘의 기록.md
```

예:

```md
---
date: 2026-05-28
topics:
  - 일상
---

오늘 있었던 일을 씁니다.
```

중요한 점:

- `content/ordinary` 아래에 바로 파일을 둡니다.
- `content/ordinary/2026/05/글.md`처럼 하위 폴더를 만들면 오류입니다.
- 월별 화면에서는 같은 달의 일상 노트가 모여 보입니다.
- `site.config.ts`의 `enableOrdinaryNotes`가 `false`이면 일상 노트 기능이 숨겨집니다.
- 일상 노트 기준 날짜 계산에는 `Asia/Colombo` 시간대가 사용됩니다.

## 홈페이지와 홈 링크 글

홈페이지 본문은 `site.config.ts`의 `homeSlug`가 가리키는 파일을 사용합니다.

기본값이면:

```text
content/홈.md
```

홈페이지에 별도 링크용 글을 보여 주려면 `content/homeLinkPages` 폴더를 사용합니다.

예:

```text
content/homeLinkPages/01 소개.md
content/homeLinkPages/02 문의.md
```

이 폴더의 글은 일반 글과 달리 날짜와 주제어 없이 간단한 안내 페이지로 쓸 수 있습니다.

## 외부 글쓰기 폴더에서 가져오기

Obsidian 같은 곳에서 글을 쓰고, 공개할 글만 따로 모아 둔 폴더를 `VAULT_PUBLISH`로 지정할 수 있습니다.

흐름은 이렇습니다.

1. Obsidian 등에서 글을 씁니다.
2. 공개할 Markdown 파일만 한 폴더에 모읍니다.
3. `site.config.ts`의 `VAULT_PUBLISH`에 그 폴더 경로를 적습니다.
4. 아래 명령으로 바뀔 내용을 확인합니다.

```powershell
npm run sync -- --check
```

5. 문제가 없으면 실제로 복사합니다.

```powershell
npm run sync
```

확인 질문 없이 바로 적용하려면:

```powershell
npm run sync -- --yes
```

`sync`가 하는 일:

- `VAULT_PUBLISH` 폴더의 `.md` 파일을 `content`로 복사합니다.
- 같은 위치에 이미 있는 파일은 내용이 다를 때만 바꿉니다.
- 원본 폴더에서 사라진 Markdown 파일은 `content`에서도 삭제합니다.
- `.git`, `.obsidian`, `.trash`, `node_modules` 폴더는 무시합니다.
- 복사 전에 Markdown 규칙을 검사합니다.

조심할 점:

- `sync`는 `content` 안의 Markdown 파일을 삭제할 수 있습니다.
- 처음에는 반드시 `npm run sync -- --check`로 계획을 먼저 확인하세요.
- `content`에 직접 쓴 글이 있고 원본 폴더에는 없다면, `sync` 때 삭제 대상이 될 수 있습니다.

## 글 검사하기

배포 전에는 아래 명령을 실행하는 것이 좋습니다.

```powershell
npm run content:check
```

이 명령은 다음 문제를 찾아 줍니다.

- `date`가 없거나 형식이 틀린 글
- `topics`가 빠진 일반 글
- 깨진 위키 링크
- 중복 주소
- 잘못된 `parent`와 `order`
- 잘못된 YouTube ID
- 잘못된 오디오 주소
- 보이지 않는 특수 문자
- 글자 인코딩이 깨졌을 가능성

한국어 설명으로 보고 싶으면:

```powershell
npm run content:check -- --ko
```

자동으로 고칠 수 있는 문제를 고치려면:

```powershell
npm run content:fix
```

한국어 설명:

```powershell
npm run content:fix -- --ko
```

자동 수정은 주로 빠진 `topics: []` 추가나 보이지 않는 문자 제거처럼 안전한 것만 처리합니다. 모든 오류가 자동으로 고쳐지는 것은 아닙니다.

## 배포 전 확인 순서

글을 고치거나 설정을 바꾼 뒤에는 아래 순서로 확인합니다.

```powershell
npm run content:check
npm run build
```

코드까지 수정했다면 이것도 실행합니다.

```powershell
npm run lint
```

`npm run build`는 Velite로 글 데이터를 만든 뒤 Next.js 빌드를 실행합니다. 그래서 앱 코드가 아니라 글의 frontmatter나 Markdown 문법 문제 때문에 실패할 수도 있습니다.

## Vercel에 배포하기

Vercel은 Git에 올라간 프로젝트를 가져가서 빌드합니다.

기본 흐름:

1. 내 컴퓨터에서 글을 씁니다.
2. 필요한 경우 `npm run sync`로 글을 `content`에 복사합니다.
3. `npm run content:check`를 실행합니다.
4. `npm run build`를 실행합니다.
5. 변경사항을 Git에 commit합니다.
6. GitHub 같은 원격 저장소에 push합니다.
7. Vercel이 저장소를 보고 자동으로 배포합니다.

Vercel에서 새 프로젝트를 만들 때:

- Git 저장소를 Import합니다.
- Framework Preset은 Next.js로 자동 인식되는 것이 정상입니다.
- Build Command는 기본값 `npm run build`를 사용합니다.
- Output Directory는 따로 바꾸지 않아도 됩니다.
- 환경변수 `VAULT_PUBLISH`를 Vercel에 넣을 필요는 보통 없습니다.

중요한 점:

- Vercel은 내 컴퓨터의 Obsidian 폴더를 볼 수 없습니다.
- Vercel은 Git에 올라간 `content` 폴더만 볼 수 있습니다.
- 새 글을 배포하려면 `sync` 후 `content` 변경사항을 commit/push해야 합니다.

## 자주 생기는 문제

### `VAULT_PUBLISH must be set before running sync.`

`site.config.ts`의 `VAULT_PUBLISH`가 비어 있습니다.

해결:

```ts
VAULT_PUBLISH: 'C:/Users/your-name/Documents/blog-publish',
```

또는 임시로 환경변수를 지정합니다.

```powershell
$env:VAULT_PUBLISH='C:/Users/your-name/Documents/blog-publish'
npm run sync -- --check
```

### `Source folder does not exist`

`VAULT_PUBLISH`에 적은 폴더가 실제로 없습니다.

확인할 것:

- 경로 철자가 맞는지
- 폴더가 삭제되거나 이동되지 않았는지
- Windows 경로에서 `\` 대신 `/`를 썼는지

### `date frontmatter is required`

일반 글에 `date`가 없습니다.

해결:

```md
---
date: 2026-05-28
topics: []
---
```

### `missing topics frontmatter`

일반 글에 `topics`가 없습니다.

해결:

```md
topics: []
```

또는:

```md
topics:
  - 기록
  - 공부
```

### `broken wiki link`

`[[링크]]`가 가리키는 글을 찾을 수 없습니다.

확인할 것:

- 파일명이 맞는지
- 폴더 이름이 맞는지
- `|` 앞의 실제 링크 대상이 맞는지

예:

```md
[[예제/Markdown과 글 연결|Markdown 예제]]
```

여기서 실제 대상은 `예제/Markdown과 글 연결`입니다.

### `youtubeId and audioSrc cannot be used together`

한 글에 YouTube와 오디오를 동시에 넣었습니다.

해결:

- 영상 글이면 `youtubeId`만 남깁니다.
- 오디오 글이면 `audioSrc`와 `audioTitle`만 남깁니다.

### `media directives are no longer supported`

예전 문법인 `::youtube` 또는 `::audio`를 사용했습니다.

해결:

- YouTube는 frontmatter의 `youtubeId`를 사용합니다.
- 오디오는 frontmatter의 `audioSrc`, `audioTitle`을 사용합니다.

### `EADDRINUSE` 또는 `port 3000 is already in use`

이미 3000번 포트를 다른 프로그램이 쓰고 있습니다.

쉬운 해결:

- 이전에 켜 둔 개발 서버 터미널을 찾아 `Ctrl + C`를 누릅니다.
- 다시 `npm run dev`를 실행합니다.

다른 포트로 실행하려면:

```powershell
npm run dev -- --port 3001
```

그리고 브라우저에서 `http://localhost:3001`을 엽니다.

## 추천 작업 순서

처음 설정할 때:

1. `npm install`
2. `site.config.ts`에서 `title`, `description`, `VAULT_PUBLISH`, `homeSlug` 확인
3. `npm run dev`
4. 브라우저에서 화면 확인

글을 새로 배포할 때:

1. 글쓰기 폴더에서 Markdown 작성
2. `npm run sync -- --check`
3. `npm run sync`
4. `npm run content:check`
5. `npm run build`
6. Git commit/push
7. Vercel 배포 확인

설정이나 코드도 바꿨을 때:

1. `npm run content:check`
2. `npm run lint`
3. `npm run build`

# blog template 운영 가이드

이 프로젝트는 Markdown 파일을 블로그 페이지로 만드는 Next.js + Velite 기반 blog template입니다. 옵시디언 보관소에서 사이트에 올릴 문서를 따로 모아 두고, 그 문서를 사이트 콘텐츠로 동기화해 로컬에서 확인하거나 빌드할 수 있습니다.

처음 사용할 때의 큰 흐름은 아래와 같습니다.

```powershell
npm install
npm run sync -- --check
npm run sync -- --yes
npm run dev
```

## 기본 개념

문서는 두 위치를 오갑니다.

- 원본 문서 위치: 옵시디언 보관소 안에서 사이트에 업로드할 Markdown 문서들을 모아 둔 폴더입니다.
- 사이트 콘텐츠 위치: blog template이 페이지를 만들 때 읽는 내부 콘텐츠 폴더입니다.

평소에는 옵시디언에서 원본 문서를 작성하고, `sync` 명령으로 사이트 콘텐츠에 반영합니다. 사이트 콘텐츠 쪽 파일을 직접 고치는 방식보다는 원본 문서를 고친 뒤 다시 동기화하는 흐름을 권장합니다.

## 원본 문서 위치 설정하기

원본 문서 위치는 [site.config.ts](./site.config.ts)의 `VAULT_PUBLISH`에 적습니다.

`VAULT_PUBLISH`에는 옵시디언 보관소에서 사이트에 업로드할 문서들을 넣어둔 특정 폴더의 절대 경로를 씁니다. 아래 값은 형식 예시입니다. 그대로 쓰지 말고 본인 컴퓨터의 실제 옵시디언 보관소 위치에 맞게 바꾸세요.

```ts
VAULT_PUBLISH: 'C:\\Users\\your-name\\Documents\\ObsidianVault\\publish'
```

PowerShell에서 경로를 확인할 때도 본인 환경에 맞는 예시 경로를 넣으면 됩니다.

```powershell
Test-Path "C:\Users\your-name\Documents\ObsidianVault\publish"
```

결과가 `True`이면 해당 폴더가 존재한다는 뜻입니다. `False`이면 경로가 틀렸거나 폴더가 아직 없는 상태입니다.

## 처음 설치하기

프로젝트 폴더로 이동한 뒤 패키지를 설치합니다. 아래 경로는 예시입니다.

```powershell
cd C:\path\to\blog-template
npm install
```

그 다음 `site.config.ts`에서 `VAULT_PUBLISH`를 본인의 옵시디언 공개 문서 폴더 절대 경로로 바꿉니다.

설정이 끝났으면 동기화 계획을 먼저 확인합니다.

```powershell
npm run sync -- --check
```

출력된 계획이 맞다면 실제로 반영합니다.

```powershell
npm run sync -- --yes
```

마지막으로 개발 서버를 실행합니다.

```powershell
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

## 글 작성하기

글은 `VAULT_PUBLISH`에 설정한 원본 문서 폴더 안에 `.md` 파일로 작성합니다. 파일 이름은 페이지 제목과 주소의 기준이 됩니다.

가장 기본적인 글은 이렇게 작성할 수 있습니다.

```markdown
---
base:
  - 글쓰기
  - 블로그
---

## 첫 문단

여기에 본문을 씁니다.
```

`base`는 이 글의 주제어입니다. 주제어는 글 하단, 주제어 페이지, 검색에 사용됩니다.

## 사용할 수 있는 frontmatter

frontmatter는 Markdown 파일 맨 위의 `---` 사이에 적는 설정입니다. 이 프로젝트에서 직접 관리하는 값은 아래와 같습니다.

```markdown
---
draft: false
base:
  - 주제어
  - 다른 주제어
---
```

- `draft`: `true`이면 사이트에 공개하지 않는 초안입니다. 생략하면 `false`로 처리됩니다.
- `base`: 글의 주제어 목록입니다. 비워 둘 수 있습니다.
- `youtubeId`: YouTube 영상을 넣을 때 사용합니다. YouTube 주소 전체가 아니라 11자리 영상 ID를 넣습니다.
- `audioSrc`: 오디오 글에 사용할 오디오 파일 주소입니다. 사이트 내부 경로나 `https://` 주소를 사용할 수 있습니다.
- `audioTitle`: 오디오 제목입니다. `audioSrc`를 쓰면 반드시 함께 적어야 합니다.

주의할 점이 있습니다.

- `youtubeId`와 `audioSrc`는 한 글에서 동시에 사용할 수 없습니다.
- `audioTitle`만 단독으로 사용할 수 없습니다.
- HTML, JSX, MDX 문법은 글 본문에서 사용하지 않습니다. 일반 Markdown으로 작성합니다.

## YouTube 글 작성하기

YouTube 글은 `youtubeId`를 사용합니다.

```markdown
---
base:
  - 영상
youtubeId: dQw4w9WgXcQ
---

## 영상 메모

영상에 대한 설명을 씁니다.
```

`youtubeId`가 있는 글은 본문 위에 YouTube 플레이어가 표시됩니다.

## 오디오 글 작성하기

오디오 글은 `audioSrc`와 `audioTitle`을 함께 사용합니다.

```markdown
---
base:
  - 오디오
audioSrc: https://example.com/audio.mp3
audioTitle: 인터뷰 녹음
---

## 00:00 시작

▶ 00:10 이 시점에 맞춰 보여 줄 메모를 씁니다.

다음 문단도 같은 cue 안에 묶입니다.

▶ 00:35 다음 시점의 메모를 씁니다.
```

오디오 글에는 재생 버튼과 진행 바가 표시됩니다.

챕터는 `## 시간 제목` 형식의 2단계 제목으로 작성합니다. 예를 들어 `## 00:00 시작`은 챕터 메뉴에 `시작`으로 표시됩니다.

cue는 문단 맨 앞에 `▶ 시간`을 붙여 작성합니다. 예를 들어 `▶ 00:10 메모`처럼 쓰면 해당 문단이 cue가 되고, 버튼을 누르면 오디오가 그 시간으로 이동합니다. 바로 뒤에 이어지는 일반 문단도 다음 cue가 나오기 전까지 같은 cue 영역에 포함됩니다.

시간은 `00:10`, `01:23`, `1:02:03` 같은 형식을 사용할 수 있습니다.

## 위키 링크 사용하기

다른 글로 연결하고 싶다면 `[[글 제목]]` 형식으로 씁니다.

```markdown
이 내용은 [[나의 첫 글]]과 이어집니다.
```

링크 대상 글이 없으면 콘텐츠 검사에서 오류로 알려 줍니다.

## 홈 하단 링크 만들기

홈 화면 하단에 따로 보여 주고 싶은 안내 글은 원본 문서 폴더 안의 홈 링크용 하위 폴더에 넣습니다. 이 위치에 들어간 글은 일반 주제어/검색 목록과 분리되어 홈 하단 링크로 표시됩니다.

홈 링크용 하위 폴더 이름은 코드에서 정해져 있으므로, 템플릿을 복사한 뒤 실제 폴더명을 바꾸고 싶다면 관련 코드도 함께 바꿔야 합니다.

## 검색과 주제어 활용하기

사이트에는 검색 기능과 주제어 페이지가 있습니다.

- `Ctrl+K` 또는 `Cmd+K`: 검색창을 엽니다.
- 전체 검색: 제목, 본문, 오디오 제목을 검색합니다.
- 주제어 검색: `base`에 적은 주제어를 기준으로 찾습니다.
- `/topics/주제어`: 특정 주제어가 붙은 글 목록을 보여 줍니다.
- `/search?q=검색어`: 검색 결과 전체 페이지를 보여 줍니다.

주제어를 잘 관리하면 관련 글, 주제어 페이지, 검색 결과가 더 유용해집니다.

## 콘텐츠 동기화하기

글을 작성하거나 삭제한 뒤에는 원본 문서를 사이트 콘텐츠로 동기화해야 합니다.

먼저 변경 계획을 확인합니다.

```powershell
npm run sync -- --check
```

계획이 맞으면 적용합니다.

```powershell
npm run sync -- --yes
```

또는 `--yes` 없이 실행하면 적용 전에 질문을 받습니다.

```powershell
npm run sync
```

`sync`는 원본 문서 폴더를 기준으로 사이트 콘텐츠를 맞춥니다. 원본 문서 폴더에 없는 Markdown 파일이 사이트 콘텐츠에만 있으면 삭제 대상이 됩니다.

## 콘텐츠 검사하기

글을 동기화한 뒤에는 콘텐츠 검사를 실행합니다.

```powershell
npm run content:check
```

이 명령은 다음 같은 문제를 확인합니다.

- 필요한 frontmatter가 빠져 있는지
- 깨진 위키 링크가 있는지
- YouTube 또는 오디오 설정이 잘못되었는지
- 보이지 않는 특수 문자가 섞였는지
- 한국어 인코딩이 깨진 흔적이 있는지

자동으로 고칠 수 있는 문제는 아래 명령으로 정리할 수 있습니다.

```powershell
npm run content:fix
```

`content:fix`는 실제 Markdown 파일을 수정할 수 있으므로, 실행 후 변경 내용을 확인하는 것이 좋습니다.

## 빌드 전에 확인하기

로컬에서 문제가 없는지 확인하려면 아래 명령을 순서대로 실행합니다.

```powershell
npm run content:check
npm run lint
npm run build
```

각 명령의 역할은 다릅니다.

- `npm run content:check`: 글과 frontmatter를 검사합니다.
- `npm run lint`: TypeScript/React 코드 규칙을 검사합니다.
- `npm run build`: Velite로 콘텐츠를 만들고 Next.js 사이트를 빌드합니다.

`npm run build`는 내부적으로 먼저 `velite`를 실행합니다. 그래서 글 문법이나 frontmatter 문제가 있으면 빌드 단계에서 발견될 수 있습니다.

빌드된 사이트를 실행해 보고 싶다면 아래 명령을 사용합니다.

```powershell
npm run start
```

`npm run start`는 먼저 `npm run build`가 성공한 뒤에 사용하는 명령입니다.

## Vercel에 연결하기

Vercel에 배포할 때는 Git 저장소를 Vercel 프로젝트로 가져오는 방식을 사용합니다. Vercel은 Next.js 프로젝트를 자동으로 감지하고, 이 프로젝트의 `package.json`에 있는 `npm run build`를 빌드 명령으로 사용합니다.

중요한 점이 있습니다. Vercel 서버는 내 컴퓨터의 옵시디언 보관소 경로에 접근할 수 없습니다. 그래서 배포 전에 로컬에서 원본 문서를 사이트 콘텐츠로 동기화하고, 동기화된 사이트 콘텐츠를 Git에 커밋한 뒤 푸시해야 합니다.

배포 전 로컬에서 먼저 확인합니다.

```powershell
npm run sync -- --check
npm run sync -- --yes
npm run content:check
npm run build
```

문제가 없다면 변경된 파일을 Git에 커밋하고 원격 저장소에 푸시합니다.

```powershell
git status
git add .
git commit -m "Update blog content"
git push
```

그 다음 Vercel에서 프로젝트를 연결합니다.

1. Vercel 대시보드에서 새 프로젝트를 만듭니다.
2. GitHub, GitLab, Bitbucket 중 이 프로젝트가 올라간 Git 서비스를 연결합니다.
3. 저장소 목록에서 이 blog template 저장소를 선택하고 가져옵니다.
4. Framework Preset은 Vercel이 자동 감지한 `Next.js`를 그대로 둡니다.
5. Build Command는 기본값인 `npm run build`를 사용합니다.
6. Output Directory는 직접 지정하지 않고 Next.js 기본값을 사용합니다.
7. Deploy를 누릅니다.

배포가 끝나면 Vercel이 제공하는 도메인으로 사이트를 확인할 수 있습니다. 이후에는 로컬에서 문서를 수정하고, 동기화하고, 커밋하고, 푸시하면 Vercel이 새 배포를 자동으로 시작합니다.

`VAULT_PUBLISH`는 로컬 작업용 설정입니다. Vercel 환경 변수에 같은 값을 넣어도 Vercel 서버에는 내 컴퓨터의 옵시디언 폴더가 없으므로 의미가 없습니다. 배포에는 Git에 올라간 사이트 콘텐츠가 사용됩니다.

## 자주 막히는 문제

### Source folder does not exist 오류가 날 때

`VAULT_PUBLISH`에 적은 원본 문서 폴더를 찾지 못한 상태입니다. `site.config.ts`의 경로가 실제로 존재하는지 확인합니다.

```powershell
Test-Path "C:\Users\your-name\Documents\ObsidianVault\publish"
```

### audioTitle required 오류가 날 때

`audioSrc`를 썼지만 `audioTitle`을 적지 않은 상태입니다.

```markdown
---
audioSrc: https://example.com/audio.mp3
audioTitle: 오디오 제목
---
```

### youtubeId and audioSrc cannot be used together 오류가 날 때

한 글에 YouTube와 오디오를 동시에 넣은 상태입니다. 둘 중 하나만 사용합니다.

### broken wiki link 오류가 날 때

`[[글 제목]]`으로 연결한 대상 글을 찾을 수 없는 상태입니다. 링크 이름이 실제 파일 이름과 맞는지 확인합니다.

### 개발 서버 포트가 이미 사용 중일 때

`npm run dev` 실행 중 포트 충돌이 나면 이미 다른 개발 서버가 실행 중일 수 있습니다. 기존 서버를 종료한 뒤 다시 실행합니다.

```powershell
npm run dev
```

## 전체 작업 흐름

평소에는 아래 순서로 사용하면 됩니다.

```powershell
# 1. 옵시디언 보관소의 공개 문서 폴더에서 Markdown 글 작성

# 2. 변경 계획 확인
npm run sync -- --check

# 3. 사이트 콘텐츠로 반영
npm run sync -- --yes

# 4. 콘텐츠 검사
npm run content:check

# 5. 로컬 실행
npm run dev
```

배포하거나 큰 변경을 하기 전에는 아래까지 확인합니다.

```powershell
npm run lint
npm run build
```

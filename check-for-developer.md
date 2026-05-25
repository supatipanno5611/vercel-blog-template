# Developer Script Check

## `scripts/content-doctor.mjs`

콘텐츠 Markdown의 frontmatter, slug, wiki link, media 설정, encoding 문제를 검사하거나 일부 문제를 자동 수정한다.

```powershell
npm run content:check
npm run content:fix
```

직접 실행할 때는 다음 형식을 쓴다.

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/content-doctor.mjs check
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/content-doctor.mjs fix
```

옵션:

- `check`: 문제를 출력하고, error 또는 fixable 문제가 있으면 실패한다.
- `fix`: 자동 수정 가능한 항목을 고친 뒤 남은 문제를 출력한다.
- `--ko`: 출력 메시지를 한국어로 표시한다.

## `scripts/sync.mjs`

`VAULT_PUBLISH`의 Markdown 파일을 `content` 폴더로 복사하고, source에 없는 target Markdown은 삭제하는 one-way publish-copy 스크립트다.

```powershell
npm run sync
```

옵션:

- `--check`: source 콘텐츠를 검증하고, 실제 파일을 바꾸지 않은 채 동기화할 변경 사항을 확인한다. 검증 문제나 변경할 내용이 있으면 실패 코드로 종료한다.
- `--yes`: 변경 계획 확인 질문 없이 바로 적용한다.

Source와 target:

- source: 환경 변수 `VAULT_PUBLISH`, 없으면 `site.config.ts`의 `VAULT_PUBLISH`
- target: 환경 변수 `VERCEL_CONTENT`, 없으면 루트의 `content`

주의:

- `--init`은 더 이상 지원하지 않는다.
- 적용 전 source Markdown에서 날짜, 목차 관계, MDX 표현식, raw HTML/JSX, 지원하지 않는 directive, 유튜브/오디오 설정 등을 검사한다.

## `scripts/unwrap-markdown.mjs`

지정한 Markdown 파일의 본문에서 일반 문단의 hard wrap을 풀어 한 문단을 한 줄로 정리한다.

```powershell
npm run content:unwrap -- content/some-file.md
npm run content:unwrap -- content/a.md content/b.md
```

직접 실행할 때는 다음 형식을 쓴다.

```powershell
node scripts/unwrap-markdown.mjs content/some-file.md
```

동작:

- frontmatter는 그대로 둔다.
- 제목, 목록, 인용문, fenced code, 표처럼 보이는 block은 건드리지 않는다.
- 변경된 파일만 `unwrapped ...`로 출력한다.

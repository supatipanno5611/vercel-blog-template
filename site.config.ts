export const siteConfig = {
  title: '',
  description: '',
  lang: 'ko',
  VAULT_PUBLISH: '',
  homeSlug: '홈',
  enableOrdinaryNotes: true,
  preserveMarkdownLineBreaks: false,
  curatedTopicSourceTitles: [] as string[],
  contentDoctor: {
    ignoreFiles: [] as string[],
    ignoreRulesBySlug: {} as Record<string, string[]>,
    ignoreRulesByFile: {} as Record<string, string[]>,
  },
}

export const siteConfig = {
  title: '',
  description: '',
  VAULT_PUBLISH: '_publish',
  homeSlug: 'home',
  curatedTopicSourceTitles: [] as string[],
  contentDoctor: {
    ignoreFiles: [] as string[],
    ignoreRulesBySlug: {} as Record<string, string[]>,
    ignoreRulesByFile: {} as Record<string, string[]>,
  },
}

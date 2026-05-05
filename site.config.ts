export const siteConfig = {
  title: 'sakko',
  description: '',
  VAULT_PUBLISH: '_publish',
  homeSlug: 'home',
  excludedSlugs: ['home', '사용-안내', '웹사이트에-기여한-사람들'],
  curatedTopicSourceTitles: [] as string[],
  footerLinks: [
    { slug: '사용-안내', label: '사용 안내' },
    { slug: '웹사이트에-기여한-사람들', label: '웹사이트에 기여한 사람들' },
  ],
  contentDoctor: {
    ignoreSlugs: ['home', '사용-안내', '웹사이트에-기여한-사람들'] as string[],
    ignoreFiles: [] as string[],
    ignoreRulesBySlug: {} as Record<string, string[]>,
    ignoreRulesByFile: {} as Record<string, string[]>,
  },
}

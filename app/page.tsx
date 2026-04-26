import { Suspense } from 'react'
import { pages } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import styles from './page.module.css'
import SearchBox from './components/SearchBox'

export default function HomePage() {
  const home = pages.find((p) => p.name === 'home')

  return (
    <main className={styles.main}>
      <div className={styles.top}>
        <h1 className={styles.title}>sakko</h1>
        {home && <div className={styles.description}><MDXContent code={home.body} /></div>}
      </div>
      <div className={styles.bottom}>
        <Suspense><SearchBox /></Suspense>
        <a href="/guide" className={styles.guide}>처음 오셨나요? →</a>
        <a href="/contributors" className={styles.guide}>기여자 →</a>
      </div>
    </main>
  )
}

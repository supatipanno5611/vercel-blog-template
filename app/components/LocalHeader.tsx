import Link from 'next/link'
import { uiText } from '@/lib/ui-text'
import { HomeIcon } from './icons'
import styles from './LocalHeader.module.css'

type Props = {
  title: string
}

export default function LocalHeader({ title }: Props) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.homeLink} aria-label={uiText.nav.home} title={uiText.nav.home}>
        <HomeIcon aria-hidden />
      </Link>
      <span className={styles.title}>{title}</span>
    </header>
  )
}

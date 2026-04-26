'use client'

import { useMemo } from 'react'
import * as runtime from 'react/jsx-runtime'

type Props = {
  code: string
}

export function MDXContent({ code }: Props) {
  const Component = useMemo(() => {
    const fn = new Function(code)
    return fn({ ...runtime }).default
  }, [code])

  return <Component />
}

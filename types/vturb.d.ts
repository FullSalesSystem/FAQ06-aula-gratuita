import type { CSSProperties } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'vturb-smartplayer': {
        id?: string
        style?: CSSProperties
        className?: string
      }
    }
  }
}

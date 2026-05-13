import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyle = {
  none: '0',
  sm:   '1rem',
  md:   '1.5rem',
  lg:   '2rem',
}

export default function Card({ padding = 'md', children, style, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 'var(--r)',
        border: '1px solid var(--border)',
        padding: paddingStyle[padding],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

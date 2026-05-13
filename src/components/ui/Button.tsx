'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'ember' | 'char' | 'outline' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClass: Record<Variant, string> = {
  ember:   'btn btn-ember',
  char:    'btn btn-char',
  outline: 'btn btn-outline',
  ghost:   'btn btn-ghost',
}

const sizeStyle: Record<Size, React.CSSProperties> = {
  sm: { fontSize: '0.8125rem', padding: '0.3rem 0.75rem', height: '2rem' },
  md: { fontSize: '0.875rem',  padding: '0.5rem 1.125rem', height: '2.5rem' },
  lg: { fontSize: '0.9375rem', padding: '0.625rem 1.5rem', height: '2.875rem' },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ember', size = 'md', loading, fullWidth, children, disabled, style, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={variantClass[variant]}
        disabled={disabled || loading}
        style={{ width: fullWidth ? '100%' : undefined, ...sizeStyle[size], ...style }}
        {...rest}
      >
        {loading && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderWidth: '2px' }} />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button

import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, style, ...rest }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {label && <label className="sab-label">{label}</label>}
        <input
          ref={ref}
          className={`sab-input${error ? ' sab-input-error' : ''}`}
          style={style}
          {...rest}
        />
        {error && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--ember)' }}>{error}</span>
        )}
        {!error && hint && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text3)' }}>{hint}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

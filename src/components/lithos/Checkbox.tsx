/**
 * Lithos UI Checkbox — customized for The Binder design doc.
 * Overrides: 16px × 16px (was 20px), border 2px (correct per doc)
 */
import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { ClassArray, ClassValue } from 'clsx'
import type { HexColor } from './core/types'
import { getContrastText } from './core/yiq'
import { cn } from '@/lib/utils'
import { IconCheck, IconMinus } from './icons'

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'className' | 'value'> {
  color?: HexColor | string | undefined
  indeterminate?: boolean | undefined
  label?: ReactNode
  description?: ReactNode
  value?: string | undefined
  className?: ClassValue | ClassArray
}

export const Checkbox = ({
  color,
  indeterminate = false,
  label,
  description,
  disabled,
  checked,
  defaultChecked,
  onChange,
  value,
  id,
  name,
  className,
  style,
  ref,
  ...rest
}: CheckboxProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const boxColor = color || 'var(--lithos-accent)'
  const contrastColor = color ? getContrastText(color) : 'var(--lithos-accent-text)'

  const colorVars: CSSProperties = {
    '--cb-color': boxColor,
    '--cb-contrast': contrastColor,
  } as CSSProperties

  const boxClasses = cn(
    'inline-block shrink-0 w-4 h-4 border-2 border-(--lithos-border) rounded-(--lithos-radius) transition-all duration-75',
    'shadow-[1px_1px_0px_0px_var(--lithos-shadow)] peer-active:shadow-none peer-active:translate-x-0.5 peer-active:translate-y-0.5',
    'peer-focus-visible:ring-2 peer-focus-visible:ring-(--lithos-text) peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-(--lithos-bg)',
    'bg-(--lithos-surface) peer-checked:bg-[var(--cb-color)] peer-indeterminate:bg-[var(--cb-color)]',
  )

  const iconColorStyle = { color: 'var(--cb-contrast)' }
  const iconBase = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 transition-opacity duration-75'
  const checkClasses = cn(iconBase, 'opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0')
  const minusClasses = cn(iconBase, 'opacity-0 peer-indeterminate:opacity-100')

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex items-start',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
      style={style}
    >
      <span className="relative inline-flex shrink-0" style={colorVars}>
        <input
          ref={(node: HTMLInputElement | null) => {
            inputRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          type="checkbox"
          id={inputId}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          value={value}
          name={name}
          className="peer sr-only"
          {...rest}
        />
        <span aria-hidden="true" className={boxClasses} />
        <IconCheck aria-hidden="true" className={checkClasses} style={iconColorStyle} />
        <IconMinus aria-hidden="true" className={minusClasses} style={iconColorStyle} />
      </span>
      {(label || description) && (
        <span className="flex flex-col ml-2">
          {label && <span className="font-bold font-mono leading-tight text-sm">{label}</span>}
          {description && <span className="text-xs font-mono opacity-70 leading-tight mt-0.5">{description}</span>}
        </span>
      )}
    </label>
  )
}

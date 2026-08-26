/**
 * Lithos UI Badge — customized for The Binder design doc.
 * Overrides: border 1px, font 10px weight 600, padding 2px 8px
 */
import { forwardRef, type ComponentPropsWithRef } from 'react'
import { getContrastText } from './core/yiq'
import { colors } from './core/colors'
import { cn } from '@/lib/utils'
import type { HexColor } from './core/types'
import type { ClassArray, ClassValue } from 'clsx'

type BadgeSizes = 'default' | 'sm' | 'md' | 'lg'
type BadgeIntents = 'default' | 'accent' | 'success' | 'error' | 'warning' | 'info'

export interface BadgeProps extends Omit<ComponentPropsWithRef<'div'>, 'className'> {
  intent?: BadgeIntents
  className?: ClassValue | ClassArray
  size?: BadgeSizes
  color?: HexColor | string
}

const sizeStyles: Record<BadgeSizes, string> = {
  sm: 'text-[8px] px-1.5 py-0.5',
  default: 'text-[10px] px-2 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
  lg: 'text-xs px-2.5 py-1',
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ children, className = '', size = 'default', intent = 'default', color, ref, ...props }: BadgeProps) => {
    const bgColor = color || (intent === 'accent' ? 'var(--lithos-accent)' : colors[intent])
    const contrastedColor = getContrastText(bgColor)

    const classes = cn(
      'uppercase font-mono font-semibold border border-(--lithos-border) py-0.5 w-max rounded-(--lithos-radius) leading-none',
      sizeStyles[size],
      className,
    )

    return (
      <div ref={ref} className={classes} style={{ backgroundColor: bgColor, color: contrastedColor }} {...props}>
        {children}
      </div>
    )
  },
)
Badge.displayName = 'Badge'

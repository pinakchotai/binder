/**
 * Lithos UI Button — customized for The Binder design doc.
 * Overrides: padding 6px 16px, border 1px, font 12px, shadow subtle
 */
import { forwardRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { getContrastText } from './core/yiq'
import type { ButtonVariant } from './core/types'
import type { ClassArray, ClassValue } from 'clsx'

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type' | 'className'> {
  variant?: ButtonVariant | undefined
  color?: string | undefined
  fullWidth?: boolean | undefined
  type?: 'button' | 'submit' | 'reset' | undefined
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children: ReactNode
  className?: ClassValue | ClassArray
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-(--lithos-accent) text-black',
  secondary: 'bg-(--lithos-surface) text-(--lithos-text)',
  accent: 'bg-(--lithos-surface) text-(--lithos-text) hover:bg-(--lithos-accent) hover:text-black',
  text: 'bg-transparent text-(--lithos-text) cursor-pointer !border-transparent !shadow-none hover:!shadow-none',
  solid: '',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    color,
    fullWidth = false,
    type = 'button',
    iconLeft,
    iconRight,
    className,
    children,
    style,
    ref,
    ...rest
  }: ButtonProps) => {
    const classes = [
      'lithos-click',
      'font-mono',
      'rounded-(--lithos-radius)',
      variantClass[variant],
      fullWidth && 'w-full',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      className,
    ]

    const isSolid = variant === 'solid'
    const solidColor = color || '#00FF00'
    const solidStyle = isSolid ? { backgroundColor: solidColor, color: getContrastText(solidColor) } : {}

    return (
      <button ref={ref} type={type} className={cn(classes)} style={{ ...solidStyle, ...style }} {...rest}>
        {iconLeft && (
          <span className="inline-flex shrink-0 mr-2" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        {children}
        {iconRight && (
          <span className="inline-flex shrink-0 ml-2" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'

export interface ButtonGroupProps extends Omit<ComponentPropsWithRef<'div'>, 'className'> {
  orientation?: 'horizontal' | 'vertical' | undefined
  attached?: boolean | undefined
  className?: ClassValue | ClassArray
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = 'horizontal', attached = false, className, children, ref, ...rest }: ButtonGroupProps) => {
    const isVertical = orientation === 'vertical'
    const classes = cn(
      'inline-flex',
      isVertical ? 'flex-col' : 'flex-row',
      attached
        ? [
            '[&>*]:relative [&>*:hover]:z-10 [&>*:focus-visible]:z-10',
            isVertical ? '[&>*:not(:first-child)]:-mt-0.5' : '[&>*:not(:first-child)]:-ml-0.5',
          ]
        : isVertical
          ? '[&>*:not(:first-child)]:mt-2'
          : '[&>*:not(:first-child)]:ml-2',
      className,
    )
    return (
      <div ref={ref} role="group" className={classes} {...rest}>
        {children}
      </div>
    )
  },
)
ButtonGroup.displayName = 'ButtonGroup'

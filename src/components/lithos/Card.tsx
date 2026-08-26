/**
 * Lithos UI Card — customized for The Binder design doc.
 * Overrides: border 1px, shadow 0 2px 8px, padding p-4, hover border→accent
 */
import { forwardRef, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CardVariants = 'default' | 'accent' | 'image' | 'solid'

export interface CardProps extends ComponentPropsWithRef<'div'> {
  interactive?: boolean | 'elevate' | undefined
  variant?: CardVariants | undefined
  children: ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, variant = 'default', className, children, ref, ...rest }: CardProps) => {
    const isImage = variant === 'image'

    const classes = cn(
      'relative border border-(--lithos-border) overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.3)] rounded-(--lithos-radius)',
      isImage
        ? 'bg-transparent text-white flex flex-col justify-end'
        : variant === 'solid'
          ? 'bg-(--lithos-accent) text-(--lithos-accent-text)'
          : 'bg-(--lithos-surface) text-(--lithos-text)',
      variant === 'accent' && 'transition-colors hover:bg-(--lithos-accent) hover:text-(--lithos-accent-text)',
      interactive &&
        (interactive === 'elevate'
          ? 'transition-transform hover:-translate-y-1'
          : 'transition-all duration-150 ease-out hover:border-(--lithos-accent)'),
      className,
    )

    return (
      <div ref={ref} className={classes} {...rest}>
        {isImage && (
          <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        )}
        {children}
      </div>
    )
  },
)
Card.displayName = 'Card'

export interface CardImageProps extends ComponentPropsWithRef<'img'> {
  src: string
  alt: string
  isBackground?: boolean | undefined
}

export const CardImage = forwardRef<HTMLImageElement, CardImageProps>(
  ({ isBackground = false, className, ref, ...rest }: CardImageProps) => {
    const classes = cn(
      isBackground
        ? 'absolute inset-0 w-full h-full object-cover z-0'
        : 'w-full h-48 object-cover block border-b border-(--lithos-border)',
      className,
    )
    return <img ref={ref} className={classes} {...rest} />
  },
)
CardImage.displayName = 'CardImage'

export interface CardContentProps extends ComponentPropsWithRef<'div'> {
  spacing?: 'sm' | 'md' | 'lg' | undefined
  children: ReactNode
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ spacing = 'md', className, children, ref, ...rest }: CardContentProps) => {
    const spacingClass = { sm: 'p-3', md: 'p-4', lg: 'p-6' }[spacing]
    return (
      <div ref={ref} className={cn('relative z-20', spacingClass, className)} {...rest}>
        {children}
      </div>
    )
  },
)
CardContent.displayName = 'CardContent'

export interface CardTitleProps extends ComponentPropsWithRef<'h3'> {
  children: ReactNode
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ref, ...rest }: CardTitleProps) => (
    <h3
      ref={ref}
      className={cn('font-mono text-sm font-bold uppercase tracking-[0.05em] leading-none mb-2', className)}
      {...rest}
    >
      {children}
    </h3>
  ),
)
CardTitle.displayName = 'CardTitle'

export interface CardDescriptionProps extends ComponentPropsWithRef<'p'> {
  children: ReactNode
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ref, ...rest }: CardDescriptionProps) => (
    <p ref={ref} className={cn('font-mono opacity-70 leading-snug', className)} {...rest}>
      {children}
    </p>
  ),
)
CardDescription.displayName = 'CardDescription'

export interface CardFooterProps extends ComponentPropsWithRef<'div'> {
  spacing?: 'sm' | 'md' | 'lg' | undefined
  children: ReactNode
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ spacing = 'md', className, children, ref, ...rest }: CardFooterProps) => {
    const spacingClass = {
      sm: 'px-3 pt-2 pb-3',
      md: 'px-4 pt-3 pb-4',
      lg: 'px-6 pt-4 pb-6',
    }[spacing]
    return (
      <div
        ref={ref}
        className={cn('relative z-20 flex items-center justify-end border-t border-(--lithos-border)', spacingClass, className)}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
CardFooter.displayName = 'CardFooter'

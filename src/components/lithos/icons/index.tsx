import {
  IconCloseSquareBold,
  IconCheckReadBold,
  IconMinusSquareBold,
} from '@ninzapp/solar-icons/bold'
import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

export const IconClose = ({ size = 16, ...props }: IconProps) => (
  <IconCloseSquareBold width={size} height={size} {...props} />
)

export const IconCheck = ({ size = 16, ...props }: IconProps) => (
  <IconCheckReadBold width={size} height={size} {...props} />
)

export const IconMinus = ({ size = 16, ...props }: IconProps) => (
  <IconMinusSquareBold width={size} height={size} {...props} />
)

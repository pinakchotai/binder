import { isHexColor } from './types'

export const getYiqValue = (hexcolor: string | undefined): number => {
  if (!hexcolor || !isHexColor(hexcolor)) return 0
  let hex = hexcolor.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  const r = parseInt(hex.substr(0, 2), 16) || 0
  const g = parseInt(hex.substr(2, 2), 16) || 0
  const b = parseInt(hex.substr(4, 2), 16) || 0
  return (r * 299 + g * 587 + b * 114) / 1000
}

export const getContrastText = (hexcolor: string | undefined): string => {
  return getYiqValue(hexcolor) >= 128 ? '#000000' : '#FFFFFF'
}

import { darkTheme, lightTheme, type Theme } from '@rainbow-me/rainbowkit'

type ThemeVars = ReturnType<typeof lightTheme>

function mergeColors(
  base: ThemeVars,
  colors: Partial<ThemeVars['colors']>,
): ThemeVars {
  return { ...base, colors: { ...base.colors, ...colors } }
}

/** Neutral grays only — no blue/purple tints in modal or connect UI */
const monochromeLightColors: Partial<ThemeVars['colors']> = {
  accentColor: '#171717',
  accentColorForeground: '#fafafa',
  actionButtonBorder: 'rgba(0, 0, 0, 0.06)',
  actionButtonBorderMobile: 'rgba(0, 0, 0, 0.08)',
  actionButtonSecondaryBackground: 'rgba(0, 0, 0, 0.06)',
  closeButton: 'rgba(23, 23, 23, 0.7)',
  closeButtonBackground: 'rgba(0, 0, 0, 0.06)',
  connectButtonBackground: '#ffffff',
  connectButtonBackgroundError: '#525252',
  connectButtonInnerBackground: '#fafafa',
  connectButtonText: '#171717',
  connectButtonTextError: '#fafafa',
  connectionIndicator: '#737373',
  downloadBottomCardBackground: '#ffffff',
  downloadTopCardBackground: '#ffffff',
  error: '#171717',
  generalBorder: 'rgba(0, 0, 0, 0.08)',
  generalBorderDim: 'rgba(0, 0, 0, 0.04)',
  menuItemBackground: 'rgba(0, 0, 0, 0.06)',
  modalBackdrop: 'rgba(0, 0, 0, 0.4)',
  modalBackground: '#ffffff',
  modalBorder: 'rgba(0, 0, 0, 0.08)',
  modalText: '#171717',
  modalTextDim: 'rgba(23, 23, 23, 0.35)',
  modalTextSecondary: 'rgba(23, 23, 23, 0.6)',
  profileAction: '#ffffff',
  profileActionHover: 'rgba(0, 0, 0, 0.04)',
  profileForeground: 'rgba(0, 0, 0, 0.06)',
  selectedOptionBorder: 'rgba(0, 0, 0, 0.1)',
  standby: '#a3a3a3',
}

const monochromeDarkColors: Partial<ThemeVars['colors']> = {
  accentColor: '#fafafa',
  accentColorForeground: '#171717',
  actionButtonBorder: 'rgba(255, 255, 255, 0.08)',
  actionButtonBorderMobile: 'rgba(255, 255, 255, 0.1)',
  actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.08)',
  closeButton: 'rgba(250, 250, 250, 0.7)',
  closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
  connectButtonBackground: '#171717',
  connectButtonBackgroundError: '#a3a3a3',
  connectButtonInnerBackground: '#262626',
  connectButtonText: '#fafafa',
  connectButtonTextError: '#171717',
  connectionIndicator: '#737373',
  downloadBottomCardBackground: '#171717',
  downloadTopCardBackground: '#171717',
  error: '#fafafa',
  generalBorder: 'rgba(255, 255, 255, 0.1)',
  generalBorderDim: 'rgba(255, 255, 255, 0.05)',
  menuItemBackground: 'rgba(255, 255, 255, 0.08)',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)',
  modalBackground: '#171717',
  modalBorder: 'rgba(255, 255, 255, 0.1)',
  modalText: '#fafafa',
  modalTextDim: 'rgba(250, 250, 250, 0.35)',
  modalTextSecondary: 'rgba(250, 250, 250, 0.6)',
  profileAction: 'rgba(255, 255, 255, 0.08)',
  profileActionHover: 'rgba(255, 255, 255, 0.12)',
  profileForeground: 'rgba(255, 255, 255, 0.06)',
  selectedOptionBorder: 'rgba(255, 255, 255, 0.12)',
  standby: '#737373',
}

export const rainbowMonochromeTheme = {
  lightMode: mergeColors(lightTheme(), monochromeLightColors),
  darkMode: mergeColors(darkTheme(), monochromeDarkColors),
} satisfies Theme

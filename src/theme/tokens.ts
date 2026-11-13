export const colors = {
  primary: "#9F214F",
  primaryDark: "#7C173D",
  heading: "#48182F",
  background: "#FFF9F7",
  surface: "#FFFFFF",
  surfaceSoft: "#F8E8EC",
  accent: "#D8AE72",
  text: "#30252B",
  textSecondary: "#746770",
  border: "#E9DDE1",
  error: "#B42318",
  success: "#18794E",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  small: 12,
  body: 14,
  regular: 16,
  subtitle: 20,
  title: 28,
  hero: 36,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
} as const;

// app/lib/theme/tokens.ts
// Color classes used by every page (language/theme state lives in usePrefs.ts).

// Monochrome gallery palette: pure white / stone grey (light) · matte charcoal (dark). Zero blue.
const lightUi = {
  page: 'bg-white text-[#111111]',
  header: 'bg-white/90 backdrop-blur-md border-[#E5E5E5] text-[#111111]',
  card: 'bg-white border-[#E5E5E5] text-[#111111]',
  soft: 'bg-[#F5F5F5]',
  line: 'border-[#E5E5E5]',
  muted: 'text-[#666666]',
  accent: 'text-[#111111]',
  btn: 'bg-[#111111] text-white hover:bg-[#2A2A2A]',
  btnGhost:
    'border-[#E5E5E5] text-[#111111] hover:border-[#111111] hover:bg-[#F5F5F5]',
  input: 'border-[#E5E5E5] text-[#111111] focus:border-[#111111]',
};

const darkUi = {
  page: 'bg-[#0B0B0C] text-[#F5F5F5]',
  header: 'bg-[#0B0B0C]/90 backdrop-blur-md border-[#262629] text-[#F5F5F5]',
  card: 'bg-[#141416] border-[#262629] text-[#F5F5F5]',
  soft: 'bg-[#1C1C1F]',
  line: 'border-[#262629]',
  muted: 'text-[#A1A1AA]',
  accent: 'text-white',
  btn: 'bg-white text-[#111111] hover:bg-[#E5E5E5]',
  btnGhost:
    'border-[#262629] text-[#F5F5F5] hover:border-[#F5F5F5]/60 hover:bg-[#1C1C1F]',
  input: 'border-[#262629] text-[#F5F5F5] focus:border-[#F5F5F5]',
};

// Every page calls getUi(isDark) and uses the returned classes
export function getUi(isDark: boolean) {
  if (isDark) {
    return darkUi;
  }
  return lightUi;
}

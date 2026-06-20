// globals.css :root is the runtime source of truth.
// tokens.ts is a typed mirror — keep in sync when :root changes.
//
// ASYMMETRY NOTE (do not invent — report only):
// primary-blue and ai-purple have a 'strong' variant but NO 'soft' variant in :root.
// success-green, warning-amber, danger-red, neutral-slate have a 'soft' variant but NO 'strong' variant in :root.
// Add the missing variants to :root first; then extend this file.

export const colors = {
  primaryBlue: '#2563eb',
  primaryBlueStrong: '#1d4ed8',
  aiPurple: '#7c3aed',
  aiPurpleStrong: '#6d28d9',
  successGreen: '#059669',
  successGreenSoft: '#ecfdf5',
  warningAmber: '#d97706',
  warningAmberSoft: '#fffbeb',
  dangerRed: '#dc2626',
  dangerRedSoft: '#fef2f2',
  neutralSlate: '#334155',
  neutralSlateSoft: '#f8fafc',
} as const;

export const radii = {
  card: '8px',
} as const;

export const elevation = {
  shadowCard: '0 1px 2px rgb(15 23 42 / 0.06), 0 12px 32px rgb(15 23 42 / 0.04)',
} as const;

export const typography = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  colorBody: '#172033',
} as const;

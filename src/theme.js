export const C = {
  paper:  '#E7E9EC',
  card:   '#FFFFFF',
  ink:    '#171C24',
  muted:  '#6B7480',
  line:   '#D3D7DD',
  warn:   '#A8492F',
  pos:    '#2F6E4A',
  slate:  '#8A929C',
};

// Assigned to goal pockets in rotation.
export const HUES = ['#A8492F','#2F6E6A','#8A6A1F','#5A4A7A','#4A6B2F','#35557E'];

// Swap these for a custom face later via expo-font.
export const F = {
  body: undefined,
  mono: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
};

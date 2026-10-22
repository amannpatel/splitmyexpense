const PALETTE = [
  { from: '#7c3aed', to: '#b794ff' },
  { from: '#ff6b57', to: '#ffb199' },
  { from: '#16b88a', to: '#7ef0c9' },
  { from: '#0ea5e9', to: '#8fd8ff' },
  { from: '#f5a300', to: '#ffe066' },
  { from: '#ec4899', to: '#ffa8d5' },
  { from: '#4f46e5', to: '#a5b4fc' },
  { from: '#0d9488', to: '#8ef0e2' },
] as const;

const EMOJI = ['🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🐙', '🦄', '🐝', '🐢', '🦉', '🐳', '🦋', '🐰', '🐻', '🐶', '🐱', '🦖', '🦜', '🐬', '🦔', '🐹'];

const SHAPES = ['circle', 'squircle', 'blob'] as const;

export type AvatarShape = (typeof SHAPES)[number];

export interface AvatarStyle {
  emoji: string;
  from: string;
  to: string;
  shape: AvatarShape;
  /** Small tilt in degrees to make the group feel hand-made. */
  tilt: number;
}

/** 32-bit FNV-1a: tiny, fast and stable across browsers. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getAvatarStyle(seed: string): AvatarStyle {
  const hash = hashString(seed);
  const colors = PALETTE[hash % PALETTE.length]!;
  return {
    emoji: EMOJI[(hash >>> 3) % EMOJI.length]!,
    from: colors.from,
    to: colors.to,
    shape: SHAPES[(hash >>> 8) % SHAPES.length]!,
    tilt: ((hash >>> 12) % 13) - 6,
  };
}

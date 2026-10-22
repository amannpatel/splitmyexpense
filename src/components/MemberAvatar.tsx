import { memo, useMemo } from 'react';
import { getAvatarStyle, type AvatarShape } from '../lib/avatar';

const SHAPES: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  squircle: 'rounded-[36%]',
  blob: 'rounded-[44%_56%_52%_48%/52%_44%_56%_48%]',
};

const SIZES = {
  sm: 'size-8 text-base',
  md: 'size-11 text-[1.4rem]',
  lg: 'size-14 text-3xl',
} as const;

interface MemberAvatarProps {
  seed: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export const MemberAvatar = memo(function MemberAvatar({ seed, size = 'md', className = '' }: MemberAvatarProps) {
  const style = useMemo(() => getAvatarStyle(seed), [seed]);
  return (
    <span
      aria-hidden
      className={`grid shrink-0 select-none place-items-center leading-none shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] ${SHAPES[style.shape]} ${SIZES[size]} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})`,
        transform: `rotate(${style.tilt}deg)`,
      }}
    >
      <span style={{ transform: `rotate(${-style.tilt}deg)` }}>{style.emoji}</span>
    </span>
  );
});

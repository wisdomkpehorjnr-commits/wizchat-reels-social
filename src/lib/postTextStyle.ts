import type { PostTextStyle } from '@/types';
import type { CSSProperties } from 'react';

export const POST_TEXT_FONT_FAMILIES: Record<NonNullable<PostTextStyle['fontFamily']>, string> = {
  system: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
  rounded: "'Trebuchet MS', sans-serif",
  mono: 'ui-monospace, monospace',
  cursive: 'cursive',
  elegant: "'Palatino Linotype', 'Book Antiqua', serif",
  modern: 'Arial, Helvetica, sans-serif',
  classic: 'Garamond, Georgia, serif',
  handwritten: "'Comic Sans MS', cursive",
  condensed: "'Arial Narrow', 'Roboto Condensed', sans-serif",
};

export const POST_TEXT_GRADIENTS = [
  { label: 'Sunset', colors: ['#ff6b6b', '#f7b267'] },
  { label: 'Berry', colors: ['#a855f7', '#ec4899'] },
  { label: 'Ocean', colors: ['#06b6d4', '#3b82f6'] },
  { label: 'Aurora', colors: ['#34d399', '#818cf8'] },
  { label: 'Peach', colors: ['#fb7185', '#fdba74'] },
  { label: 'Lavender', colors: ['#c084fc', '#93c5fd'] },
  { label: 'Mint', colors: ['#2dd4bf', '#bef264'] },
  { label: 'Citrus', colors: ['#facc15', '#4ade80'] },
  { label: 'Rose gold', colors: ['#fda4af', '#fcd34d'] },
  { label: 'Twilight', colors: ['#4338ca', '#c026d3'] },
  { label: 'Glacier', colors: ['#67e8f9', '#c4b5fd'] },
  { label: 'Forest', colors: ['#166534', '#a3e635'] },
] as const;

const isHexColor = (value: string | undefined): value is string =>
  Boolean(value && /^#[\da-f]{6}$/i.test(value));

const withAlpha = (color: string, alpha: number) => {
  const safeColor = isHexColor(color) ? color : '#34d399';
  const red = Number.parseInt(safeColor.slice(1, 3), 16);
  const green = Number.parseInt(safeColor.slice(3, 5), 16);
  const blue = Number.parseInt(safeColor.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getLuminance = (color: string) => {
  const channels = [1, 3, 5].map(offset => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};

export const getPostTextPresentation = (style?: PostTextStyle): CSSProperties => {
  const backgroundColor = isHexColor(style?.backgroundColor) ? style.backgroundColor : undefined;
  const accentColor = isHexColor(style?.backgroundAccentColor) ? style.backgroundAccentColor : '#818cf8';
  const backgroundLuminance = backgroundColor
    ? (getLuminance(backgroundColor) + (style?.backgroundMode === 'gradient' || style?.backgroundMode === 'blur' ? getLuminance(accentColor) : getLuminance(backgroundColor))) / 2
    : undefined;
  const automaticTextColor = backgroundLuminance === undefined
    ? undefined
    : backgroundLuminance > 0.42 ? '#111827' : '#ffffff';
  let backgroundImage: string | undefined;

  if (style?.backgroundMode === 'gradient' && backgroundColor) {
    backgroundImage = `linear-gradient(135deg, ${backgroundColor}, ${accentColor})`;
  } else if (style?.backgroundMode === 'blur' && backgroundColor) {
    backgroundImage = `radial-gradient(circle at 18% 20%, ${withAlpha(backgroundColor, 0.8)}, transparent 55%), radial-gradient(circle at 82% 76%, ${withAlpha(accentColor, 0.75)}, transparent 58%)`;
  }

  return {
    color: isHexColor(style?.textColor) ? style.textColor : automaticTextColor,
    backgroundColor: style?.backgroundMode === 'glass' ? undefined : backgroundColor,
    backgroundImage,
    fontFamily: style?.fontFamily ? POST_TEXT_FONT_FAMILIES[style.fontFamily] : undefined,
    fontWeight: style?.bold ? 700 : 400,
    fontStyle: style?.italic ? 'italic' : 'normal',
    textAlign: style?.textAlign || 'left',
  };
};

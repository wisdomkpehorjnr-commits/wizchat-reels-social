import type { PostTextStyle } from '@/types';

export const POST_TEXT_FONT_FAMILIES: Record<NonNullable<PostTextStyle['fontFamily']>, string> = {
  system: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
  rounded: "'Trebuchet MS', sans-serif",
  mono: 'ui-monospace, monospace',
  cursive: 'cursive',
};

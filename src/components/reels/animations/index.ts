import { keyframes, css } from '@emotion/react';

// Heart animation for double-tap likes
export const floatingHeartKeyframes = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100px) scale(0.8);
  }
`;

// Button scale bounce animation
export const buttonBounceKeyframes = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
`;

// Ripple effect for audio icon
export const rippleKeyframes = keyframes`
  0% {
    opacity: 1;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
`;

// Shimmer loading animation
export const shimmerKeyframes = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// Smooth fade in animation
export const fadeInKeyframes = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Smooth fade out animation
export const fadeOutKeyframes = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

// Slide up animation for bottom sheet
export const slideUpKeyframes = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Slide down animation for bottom sheet exit
export const slideDownKeyframes = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
`;

// Marquee animation for scrolling text
export const marqueeKeyframes = keyframes`
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
`;

// Pulse animation for highlights
export const pulseKeyframes = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

// CSS animation objects for easy reuse
export const animations = {
  floatingHeart: css`
    animation: ${floatingHeartKeyframes} 1.5s ease-out forwards;
  `,
  buttonBounce: css`
    animation: ${buttonBounceKeyframes} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  `,
  ripple: css`
    animation: ${rippleKeyframes} 0.8s ease-out forwards;
  `,
  shimmer: css`
    animation: ${shimmerKeyframes} 2s infinite;
    background-size: 1000px 100%;
  `,
  fadeIn: css`
    animation: ${fadeInKeyframes} 0.3s ease-in;
  `,
  fadeOut: css`
    animation: ${fadeOutKeyframes} 0.3s ease-out;
  `,
  slideUp: css`
    animation: ${slideUpKeyframes} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  `,
  slideDown: css`
    animation: ${slideDownKeyframes} 0.3s ease-in;
  `,
  marquee: css`
    animation: ${marqueeKeyframes} 10s linear infinite;
    white-space: nowrap;
    overflow: hidden;
  `,
  pulse: css`
    animation: ${pulseKeyframes} 2s ease-in-out infinite;
  `,
};

// Transition utilities
export const transitions = {
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  snappy: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  bouncy: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  page: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
};

// Easing functions for advanced animations
export const easings = {
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  custom: {
    tiktokScroll: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    resistance: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

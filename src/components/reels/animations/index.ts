// Keyframes for animations
export const floatingHeartKeyframes = `
  @keyframes floatingHeart {
    0% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-100px) scale(0.8);
    }
  }
`;

export const buttonBounceKeyframes = `
  @keyframes buttonBounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }
`;

export const rippleKeyframes = `
  @keyframes ripple {
    0% {
      opacity: 1;
      transform: scale(0.8);
    }
    100% {
      opacity: 0;
      transform: scale(1.6);
    }
  }
`;

export const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

export const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const fadeOutKeyframes = `
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;

export const slideUpKeyframes = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export const slideDownKeyframes = `
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;

export const marqueeKeyframes = `
  @keyframes marquee {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`;

export const pulseKeyframes = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`;

// CSS animation classes
export const animations = {
  floatingHeart: 'animate-[floatingHeart_1.5s_ease-out_forwards]',
  buttonBounce: 'animate-[buttonBounce_0.4s_cubic-bezier(0.34,1.56,0.64,1)]',
  ripple: 'animate-[ripple_0.8s_ease-out_forwards]',
  shimmer: 'animate-[shimmer_2s_infinite]',
  fadeIn: 'animate-[fadeIn_0.3s_ease-in]',
  fadeOut: 'animate-[fadeOut_0.3s_ease-out]',
  slideUp: 'animate-[slideUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)]',
  slideDown: 'animate-[slideDown_0.3s_ease-in]',
  marquee: 'animate-[marquee_10s_linear_infinite]',
  pulse: 'animate-[pulse_2s_ease-in-out_infinite]',
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

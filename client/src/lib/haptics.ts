/**
 * Haptic feedback utility for PWA
 * Provides physical feedback on user interactions
 */

export const haptics = {
  /**
   * Short vibration for light actions (e.g. clicking a tab, toggle)
   */
  light: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium vibration for success/impact actions (e.g. adding to cart)
   */
  medium: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Strong vibration for major actions (e.g. completing order, error)
   */
  heavy: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(60);
    }
  },

  /**
   * Double pulse for notifications or warnings
   */
  success: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Pattern for errors
   */
  error: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};

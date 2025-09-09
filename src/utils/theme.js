// Theme Management Utilities

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

export const THEME_STORAGE_KEY = 'vfxb-theme';

/**
 * Get the stored theme preference from localStorage
 */
export const getStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored && Object.values(THEMES).includes(stored) ? stored : THEMES.SYSTEM;
  } catch (error) {
    console.warn('Failed to get stored theme:', error);
    return THEMES.SYSTEM;
  }
};

/**
 * Store theme preference in localStorage
 */
export const setStoredTheme = (theme) => {
  try {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn('Invalid theme value:', theme);
      return false;
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch (error) {
    console.warn('Failed to store theme:', error);
    return false;
  }
};

/**
 * Get system theme preference
 */
export const getSystemTheme = () => {
  if (typeof window === 'undefined') return THEMES.LIGHT;
  
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? THEMES.DARK 
      : THEMES.LIGHT;
  } catch (error) {
    console.warn('Failed to get system theme:', error);
    return THEMES.LIGHT;
  }
};

/**
 * Resolve the actual theme to apply (handles 'system' theme)
 */
export const resolveTheme = (theme) => {
  if (theme === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return theme;
};

/**
 * Apply theme to document
 */
export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  // Add new theme class
  root.classList.add(resolvedTheme);
  
  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', resolvedTheme);
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(resolvedTheme);
};

/**
 * Update meta theme-color for mobile browsers
 */
const updateMetaThemeColor = (theme) => {
  if (typeof document === 'undefined') return;
  
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const colors = {
      [THEMES.LIGHT]: '#ffffff',
      [THEMES.DARK]: '#0a0a0a'
    };
    metaThemeColor.setAttribute('content', colors[theme] || colors[THEMES.LIGHT]);
  }
};

/**
 * Listen for system theme changes
 */
export const createSystemThemeListener = (callback) => {
  if (typeof window === 'undefined') return () => {};
  
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const systemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
      callback(systemTheme);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  } catch (error) {
    console.warn('Failed to create system theme listener:', error);
  }
  
  return () => {}; // No-op cleanup function
};

/**
 * Initialize theme on app startup
 */
export const initializeTheme = () => {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  return storedTheme;
};

/**
 * Toggle between light and dark themes
 */
export const toggleTheme = (currentTheme) => {
  const resolvedCurrent = resolveTheme(currentTheme);
  const newTheme = resolvedCurrent === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  setStoredTheme(newTheme);
  applyTheme(newTheme);
  return newTheme;
};

/**
 * Get theme-specific CSS variables
 */
export const getThemeVariables = (theme) => {
  const resolvedTheme = resolveTheme(theme);
  
  const variables = {
    [THEMES.LIGHT]: {
      '--background': '0 0% 100%',
      '--foreground': '222.2 84% 4.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '222.2 84% 4.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '222.2 84% 4.9%',
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96%',
      '--secondary-foreground': '222.2 84% 4.9%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '222.2 84% 4.9%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '221.2 83.2% 53.3%'
    },
    [THEMES.DARK]: {
      '--background': '222.2 84% 4.9%',
      '--foreground': '210 40% 98%',
      '--card': '222.2 84% 4.9%',
      '--card-foreground': '210 40% 98%',
      '--popover': '222.2 84% 4.9%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '217.2 91.2% 59.8%',
      '--primary-foreground': '222.2 84% 4.9%',
      '--secondary': '217.2 32.6% 17.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '217.2 32.6% 17.5%',
      '--muted-foreground': '215 20.2% 65.1%',
      '--accent': '217.2 32.6% 17.5%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '217.2 32.6% 17.5%',
      '--input': '217.2 32.6% 17.5%',
      '--ring': '224.3 76.3% 94.1%'
    }
  };
  
  return variables[resolvedTheme] || variables[THEMES.LIGHT];
};

/**
 * Apply CSS variables to document
 */
export const applyCSSVariables = (theme) => {
  if (typeof document === 'undefined') return;
  
  const variables = getThemeVariables(theme);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

/**
 * Check if dark mode is preferred
 */
export const isDarkMode = (theme) => {
  return resolveTheme(theme) === THEMES.DARK;
};

/**
 * Check if light mode is preferred
 */
export const isLightMode = (theme) => {
  return resolveTheme(theme) === THEMES.LIGHT;
};

/**
 * Get contrast color for a given theme
 */
export const getContrastColor = (theme) => {
  return isDarkMode(theme) ? '#ffffff' : '#000000';
};

/**
 * Get theme-aware color
 */
export const getThemeColor = (theme, colorKey) => {
  const variables = getThemeVariables(theme);
  return variables[`--${colorKey}`] || variables['--foreground'];
};

export default {
  THEMES,
  THEME_STORAGE_KEY,
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  resolveTheme,
  applyTheme,
  createSystemThemeListener,
  initializeTheme,
  toggleTheme,
  getThemeVariables,
  applyCSSVariables,
  isDarkMode,
  isLightMode,
  getContrastColor,
  getThemeColor
};
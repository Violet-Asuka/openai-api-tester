export type ColorTheme = 'ocean' | 'lavender' | 'sunset' | 'forest' | 'rose' | 'monochrome' | 'light';

export interface ThemeConfig {
  background: string;
  header: string;
  border: string;
  accent: string;
  button: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    onDark: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
}

export const colorThemes: Record<ColorTheme, ThemeConfig> = {
  ocean: {
    background: 'from-cyan-50/90 via-teal-50/80 to-emerald-50/70',
    header: 'from-cyan-600 via-teal-600 to-emerald-600',
    border: 'border-cyan-100/30',
    accent: 'text-teal-600',
    button: 'hover:bg-teal-50 text-teal-700',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  lavender: {
    background: 'from-violet-50/90 via-purple-50/80 to-indigo-50/70',
    header: 'from-violet-600 via-purple-600 to-indigo-600',
    border: 'border-violet-100/30',
    accent: 'text-violet-600',
    button: 'hover:bg-violet-50 text-violet-700',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  sunset: {
    background: 'from-orange-50/90 via-amber-50/80 to-yellow-50/70',
    header: 'from-orange-600 via-amber-600 to-yellow-600',
    border: 'border-orange-100/30',
    accent: 'text-orange-600',
    button: 'hover:bg-orange-50 text-orange-700',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  forest: {
    background: 'from-green-50/90 via-emerald-50/80 to-lime-50/70',
    header: 'from-green-600 via-emerald-600 to-lime-600',
    border: 'border-green-100/30',
    accent: 'text-emerald-600',
    button: 'hover:bg-emerald-50 text-emerald-700',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  rose: {
    background: 'from-rose-50/90 via-pink-50/80 to-fuchsia-50/70',
    header: 'from-rose-600 via-pink-600 to-fuchsia-600',
    border: 'border-rose-100/30',
    accent: 'text-rose-600',
    button: 'hover:bg-rose-50 text-rose-700',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  monochrome: {
    background: 'from-gray-50/90 via-slate-50/80 to-zinc-50/70',
    header: 'from-gray-700 via-slate-700 to-zinc-700',
    border: 'border-gray-200/30',
    accent: 'text-gray-700',
    button: 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors',
    text: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600',
      muted: 'text-gray-500',
      inverse: 'text-white',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  },
  light: {
    background: 'bg-white/95',
    header: 'from-slate-950 via-slate-900 to-slate-950',
    border: 'border-slate-200/60',
    accent: 'text-slate-800',
    button: 'hover:bg-slate-50 text-slate-700 hover:text-slate-900 hover:shadow-sm active:bg-slate-100 transition-all',
    text: {
      primary: 'text-slate-900',
      secondary: 'text-slate-700',
      muted: 'text-slate-500',
      inverse: 'text-slate-900',
      onDark: {
        primary: 'text-white',
        secondary: 'text-slate-200',
        muted: 'text-slate-300'
      }
    }
  }
} as const;

export type ThemeColors = typeof colorThemes[ColorTheme]; 
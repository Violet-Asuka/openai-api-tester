import { fontFamily } from "tailwindcss/defaultTheme"
import tailwindcssAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                theme: {
                    ocean: {
                        light: '#E6FFFA',
                        DEFAULT: '#0D9488',
                        dark: '#115E59'
                    },
                    lavender: {
                        light: '#F3E8FF',
                        DEFAULT: '#9333EA',
                        dark: '#6B21A8'
                    },
                    sunset: {
                        light: '#FFF7ED',
                        DEFAULT: '#EA580C',
                        dark: '#9A3412'
                    },
                    forest: {
                        light: '#ECFDF5',
                        DEFAULT: '#059669',
                        dark: '#065F46'
                    },
                    rose: {
                        light: '#FFF1F2',
                        DEFAULT: '#E11D48',
                        dark: '#9F1239'
                    }
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                "2xl": "1rem",
                "3xl": "1.5rem",
            },
            fontFamily: {
                sans: ["var(--font-sans)", ...fontFamily.sans],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "theme-fade": {
                    "0%": { opacity: 0 },
                    "100%": { opacity: 1 }
                },
                "theme-scale": {
                    "0%": { transform: "scale(0.95)" },
                    "100%": { transform: "scale(1)" }
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "theme-fade": "theme-fade 0.3s ease-in-out",
                "theme-scale": "theme-scale 0.3s ease-in-out"
            },
            transitionProperty: {
                'theme': 'background-color, border-color, color, fill, stroke',
            },
            boxShadow: {
                'theme': '0 0 0 2px var(--theme-border)',
            }
        },
    },
    plugins: [
        tailwindcssAnimate,
        require('tailwind-scrollbar')({ nocompatible: true }),
        function({ addUtilities }) {
            const newUtilities = {
                '.backdrop-blur-2xl': {
                    '--tw-backdrop-blur': 'blur(40px)',
                    'backdrop-filter': 'var(--tw-backdrop-blur)',
                },
                '.backdrop-saturate-150': {
                    '--tw-backdrop-saturate': 'saturate(1.5)',
                    'backdrop-filter': 'var(--tw-backdrop-saturate)',
                }
            }
            addUtilities(newUtilities)
        }
    ],
    variants: {
        scrollbar: ['rounded', 'hover'],
        extend: {
            opacity: ['group-hover'],
            scale: ['group-hover'],
            transform: ['group-hover'],
        }
    }
}

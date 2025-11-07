import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background-pure-dark': '#0B0F19',
        'background-elevated': '#0F1524',
        'background-elevated-hover': '#1A2033',
        'bg-pure-dark': '#0B0F19',
        'bg-elevated': '#0F1524',
        'bg-elevated-hover': '#1A2033',
        'accent-primary': '#5B7CFF',
        'accent-primary-hover': '#7A96FF',
        'accent-secondary': '#A855F7',
        'accent-yellow': '#FDE047',
        'text-primary': '#1E3A8A',
        'text-secondary': '#1E40AF',
        'text-tertiary': '#3B82F6',
        'text-accent': '#1E40AF',
        'text-white': '#FFFFFF',
        'text-blue-dark-primary': '#1E3A8A',
        'text-blue-dark-secondary': '#1E40AF',
        'text-blue-medium': '#3B82F6',
        // Hero atmospheric colors
        'hero-title': '#F8FAFC',
        'hero-subtitle': '#E2E8F0',
        'hero-description': '#CBD5E1',
        'semantic-success': '#22C55E',
        'semantic-warning': '#F59E0B',
        'semantic-error': '#EF4444',
        'semantic-info': '#3B82F6',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        'border-moderate': 'rgba(255, 255, 255, 0.12)',
        'border-accent': '#5B7CFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'hero': ['56px', { lineHeight: '1.1' }],
        'h1': ['40px', { lineHeight: '1.2' }],
        'h2': ['32px', { lineHeight: '1.2' }],
        'h3': ['24px', { lineHeight: '1.3' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],
        'body': ['16px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'glass': '0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-hover': '0 0 0 1px rgba(255, 255, 255, 0.12), 0 12px 48px rgba(0, 0, 0, 0.5)',
        'glow-accent-sm': '0 0 12px rgba(91, 124, 255, 0.4)',
        'glow-accent-md': '0 0 20px rgba(91, 124, 255, 0.5), 0 0 40px rgba(91, 124, 255, 0.3)',
        'glow-accent-lg': '0 0 32px rgba(91, 124, 255, 0.6), 0 0 64px rgba(91, 124, 255, 0.4)',
        'glow-blue-sm': '0 0 10px rgba(98, 184, 210, 0.5)',
        'glow-blue-md': '0 0 20px rgba(98, 184, 210, 0.6), 0 0 40px rgba(98, 184, 210, 0.4)',
        'glow-blue-lg': '0 0 32px rgba(98, 184, 210, 0.7), 0 0 64px rgba(98, 184, 210, 0.5)',
      },
      textShadow: {
        // Hero atmospheric glows
        'hero-title': '0 0 15px rgba(248, 250, 252, 0.8), 0 0 30px rgba(248, 250, 252, 0.6)',
        'hero-subtitle': '0 0 10px rgba(226, 232, 240, 0.7), 0 0 20px rgba(226, 232, 240, 0.5)',
        'hero-description': '0 0 8px rgba(203, 213, 225, 0.6), 0 0 15px rgba(203, 213, 225, 0.4)',
        // Legacy glows (deprecated, kept for backwards compatibility)
        'glow-sm': '0 0 10px rgba(30, 58, 138, 0.8), 0 0 20px rgba(30, 58, 138, 0.6)',
        'glow-md': '0 0 10px rgba(30, 64, 175, 0.8), 0 0 20px rgba(30, 64, 175, 0.6), 0 0 30px rgba(30, 64, 175, 0.4)',
        'glow-lg': '0 0 15px rgba(30, 58, 138, 1), 0 0 30px rgba(30, 58, 138, 0.8), 0 0 45px rgba(30, 58, 138, 0.6)',
        'glow-blue-dark': '0 0 10px rgba(30, 58, 138, 0.8), 0 0 20px rgba(30, 58, 138, 0.6)',
      },
      transitionDuration: {
        'normal': '250ms',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '10px',
        'md': '20px',
        'lg': '40px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ matchUtilities, theme }: any) {
      matchUtilities(
        {
          'text-shadow': (value: string) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    },
  ],
} satisfies Config;

export default config;

import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-inter)', 'var(--font-nunito)', 'sans-serif'],
        sans: ['var(--font-inter)', 'var(--font-nunito)', 'sans-serif'],
        headline: ['var(--font-poppins)', 'sans-serif'],
        code: ['monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.6' }],
        lg: ['15px', { lineHeight: '1.5' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        stat: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      transitionDuration: {
        fast: '150ms',
      },
      transitionTimingFunction: {
        smooth: 'ease',
      },
      colors: {
        // ── Design system brand tokens ──────────────────────────────
        brand: {
          DEFAULT: '#2563EB',
          dark: '#3B82F6',
        },
        // ── Surface tokens (use with bg-surface-*) ─────────────────
        surface: {
          'page-light': '#FFFFFF',
          'sidebar-light': '#F3F4F6',
          'card-light': '#FFFFFF',
          'page-dark': '#0D0D14',
          'sidebar-dark': '#13131F',
          'card-dark': '#1A1A2E',
        },
        // ── Text tokens (use with text-ds-*) ───────────────────────
        ds: {
          'primary-light': '#0A0A0A',
          'secondary-light': '#6B7280',
          'muted-light': '#9CA3AF',
          'primary-dark': '#F0F0FF',
          'secondary-dark': '#8B8FA8',
          'muted-dark': '#5C5F72',
          'border-light': '#E5E7EB',
          'border-dark': '#252538',
          'border-dark-hover': '#3A3A55',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: '8px',
        btn: '8px',
        badge: '4px',
        toggle: '9999px',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in-from-left': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'slide-out-to-left': {
          '0%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-out-to-left': 'slide-out-to-left 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

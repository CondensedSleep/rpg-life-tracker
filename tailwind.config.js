/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      colors: {
        'base': 'var(--bg-base)',
        'card': 'var(--bg-card)',
        'card-secondary': 'var(--bg-card-secondary)',
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'tertiary': 'var(--text-tertiary)',
        'red': 'var(--accent-red)',
        'red-hover': 'var(--accent-red-hover)',
        'green': 'var(--accent-green)',
        'green-hover': 'var(--accent-green-hover)',
        'amber': 'var(--accent-amber)',
        'subtle': 'var(--border-subtle)',
      },
      boxShadow: {
        'hard': 'var(--shadow-hard)',
        'card': 'var(--shadow-card)',
        'card-hover': '0 6px 0 rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

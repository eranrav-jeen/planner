/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: '#232122',
        coral: '#E45B4E',
        amber: '#F3AB56',
        lavender: '#E7B6EB',
        bg: '#FAFAFA',
        surface: '#FFFFFF',
        border: '#E7E5E4',
        muted: '#6B7280',
        success: '#3FA372',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 6px -1px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './electron/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wechat: {
          green: '#07C160',
          'green-light': '#95EC69',
          'green-dark': '#05a14e',
          sidebar: '#2C2C2C',
          'sidebar-hover': '#3d3d3d',
          'chat-bg': '#EDEDED',
          'msg-self': '#95EC69',
          'msg-other': '#FFFFFF',
          divider: '#E5E5E5'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Helvetica Neue', 'sans-serif']
      }
    }
  },
  plugins: []
}

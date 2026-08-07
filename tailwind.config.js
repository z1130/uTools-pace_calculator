export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 语义色 → index.css 的 CSS 变量，深浅模式切换由变量层完成
      // 组件里禁止再写具体色值和 dark: 灰色类
      colors: {
        brand: {
          50: 'var(--c-brand-50)',
          500: 'var(--c-brand)', // 填充档：按钮底色、边框、徽章
          text: 'var(--c-brand-text)', // 文字档：标签、Tab、着色文字（深色下比填充档亮）
        },
        card: 'var(--c-card)',
        pop: 'var(--c-pop)',
        line: 'var(--c-line)',
        field: 'var(--c-field)',
        fieldline: 'var(--c-fieldline)',
        ink: 'var(--c-ink)',
        mute: 'var(--c-mute)',
        btn2: 'var(--c-btn2)',
        btn2text: 'var(--c-btn2-text)',
      },
    },
  },
}

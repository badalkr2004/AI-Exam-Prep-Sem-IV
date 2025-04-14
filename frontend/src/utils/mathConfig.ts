// MathJax configuration options for LaTeX rendering
export const mathJaxOptions = {
  chtml: {
    scale: 1,
    minScale: 0.5,
    mtextFont: '',
    merrorFont: '',
    fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2',
  },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true,
    processRefs: true,
    macros: {
      R: '{\\mathbb{R}}',
      N: '{\\mathbb{N}}',
      Z: '{\\mathbb{Z}}',
      Q: '{\\mathbb{Q}}',
      C: '{\\mathbb{C}}',
      argmax: '{\\operatorname{arg\\,max}}',
      argmin: '{\\operatorname{arg\\,min}}',
      prob: '{\\operatorname{P}}',
      expect: '{\\operatorname{E}}',
      var: '{\\operatorname{Var}}',
      cov: '{\\operatorname{Cov}}',
      diag: '{\\operatorname{diag}}',
      norm: ['{\\left\\lVert #1 \\right\\rVert}', 1],
      inner: ['{\\left\\langle #1, #2 \\right\\rangle}', 2],
      set: ['{\\left\\{#1\\right\\}}', 1],
      abs: ['{\\left|#1\\right|}', 1],
      paren: ['{\\left(#1\\right)}', 1],
      bracket: ['{\\left[#1\\right]}', 1],
      floor: ['{\\left\\lfloor#1\\right\\rfloor}', 1],
      ceil: ['{\\left\\lceil#1\\right\\rceil}', 1],
    },
    packages: {
      '[+]': ['ams', 'noerrors', 'physics', 'color', 'boldsymbol', 'cases']
    }
  },
  svg: {
    fontCache: 'global' as const,
    scale: 1.2,
  }
}; 
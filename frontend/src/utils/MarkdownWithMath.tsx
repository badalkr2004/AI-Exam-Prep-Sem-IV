import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

// Define MathJax configuration options for better rendering
const mathJaxOptions = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined', 'autoload', 'color', 'newcommand'],
    macros: {
      // Add some common LaTeX macros if needed
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}"
    }
  },
  svg: {
    fontCache: 'global',
    scale: 1.2, // Slightly larger for better readability
    minScale: 0.5,
    mtextInheritFont: false,
    merrorInheritFont: true,
    mathmlSpacing: false,
  },
  displayAlign: 'left',
  output: 'svg', // Use SVG output for better quality
  chtml: {
    scale: 1.2,
  },
  loader: {
    load: ['[tex]/autoload', '[tex]/noerrors', '[tex]/color', '[tex]/newcommand']
  }
};

// A helper component for consistent markdown rendering
export const MarkdownWithMath: React.FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
    >
      {children}
    </ReactMarkdown>
  );
}; 
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import type { Components } from 'react-markdown';

// Define MathJax configuration options for better rendering
export const mathJaxOptions = {
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

interface MarkdownWithMathProps {
  children: string;
  className?: string;
  isUserMessage?: boolean;
}

export const MarkdownWithMath: React.FC<MarkdownWithMathProps> = ({ 
  children, 
  className = '', 
  isUserMessage = false 
}) => {
  // Create the custom components
  const components: Components = {
    p: ({ children, ...props }) => <p className="mb-4 last:mb-0" {...props}>{children}</p>,
    ul: ({ children, ...props }) => <ul className="list-disc pl-6 mb-4" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="list-decimal pl-6 mb-4" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li className="mb-1" {...props}>{children}</li>,
    h1: ({ children, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5" {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4" {...props}>{children}</h3>,
    a: ({ children, ...props }) => <a className="text-blue-600 hover:underline" {...props}>{children}</a>,
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      // Check if this is an inline code block based on className (language-* indicates block)
      const isInline = !match;
      
      return isInline ? (
        <code className="bg-gray-100 rounded px-1 py-0.5" {...props}>{children}</code>
      ) : (
        <code className={`block bg-gray-100 p-2 rounded overflow-x-auto mb-4 ${className || ''}`} {...props}>{children}</code>
      );
    }
  };

  return (
    <div className={`markdown-content ${isUserMessage ? 'text-white' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownWithMath; 
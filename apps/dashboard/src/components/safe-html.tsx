'use client';

import { useEffect, useRef } from 'react';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders HTML content safely by using the browser's built-in
 * DOMParser to strip dangerous elements (script, iframe, etc.).
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current)
      return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove dangerous elements
    const dangerous = doc.querySelectorAll(
      'script, iframe, object, embed, form, input, textarea, select, button, link[rel="import"], meta[http-equiv]',
    );
    dangerous.forEach((el) => {
      el.remove();
    });

    // Remove dangerous attributes
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        if (
          attr.name.startsWith('on')
          || (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))
          || (attr.name === 'src' && attr.value.trim().toLowerCase().startsWith('javascript:'))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    containerRef.current.innerHTML = doc.body.innerHTML;
  }, [html]);

  return <div ref={containerRef} className={className} />;
}

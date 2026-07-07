'use client';

import DOMPurify from 'isomorphic-dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders HTML content safely using DOMPurify for sanitization.
 *
 * Only allows a curated set of tags and attributes to prevent XSS attacks.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
    ADD_ATTR: ['target'],
  });
  return (
    // eslint-disable-next-line react/dom-no-dangerously-set-innerhtml -- HTML sanitized by DOMPurify above
    <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}

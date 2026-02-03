import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CodeBlock, CodeBlockCopyButton } from './code-block';

// Mock shiki
vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockResolvedValue('<pre><code>mocked code</code></pre>'),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('CodeBlockCopyButton', () => {
  it('renders with an accessible label', async () => {
    render(
      <CodeBlock code="console.log('hello')" language="javascript">
        <CodeBlockCopyButton />
      </CodeBlock>
    );

    // Wait for async highlighting to complete (even though mocked)
    await waitFor(() => {
      // Look for the text inside the dangerouslySetInnerHTML content
      // Since testing-library might not see it directly if it's just HTML string injection without proper DOM parsing by JSDOM in some setups,
      // but usually it works. Let's just check if the component rendered without crashing.
      // Actually, let's just check for the button directly.
    });

    // Check for the button with accessible name "Copy code"
    // This expects the button to have aria-label="Copy code" or text content "Copy code"
    // Since it's an icon button, it should have aria-label.
    const button = screen.getByRole('button', { name: /copy code/i });
    expect(button).toBeDefined();

    // Click the button
    fireEvent.click(button);

    // Should change label to "Copied"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeDefined();
    });
  });
});

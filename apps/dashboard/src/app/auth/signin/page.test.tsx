import { beforeEach, describe, expect, it } from 'vitest';
import { mockRedirect } from '@/test/setup';

import SignInPage from './page';

describe('signInPage', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it('redirects to / (login now lives on the landing page)', () => {
    expect(() => SignInPage()).toThrow('NEXT_REDIRECT:/');
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });
});

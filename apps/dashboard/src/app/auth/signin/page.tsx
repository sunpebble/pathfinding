import { redirect } from 'next/navigation';

/**
 * Login now lives inline on `/`. This route only exists so old
 * links/bookmarks to `/auth/signin` keep working.
 */
export default function SignInPage() {
  redirect('/');
}

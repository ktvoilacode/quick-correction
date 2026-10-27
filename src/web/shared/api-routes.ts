/**
 * GENERATED — do not edit. Run `npm run gen:routes`.
 *
 * Every path the API actually serves, as a type. Passing a path that is not
 * in this union is a compile error, not a 404 at runtime.
 */

export type ApiRoute =
  | '/api/admin/roles'
  | '/api/admin/summary'
  | '/api/audit/list'
  | '/api/auth/forgot-password'
  | '/api/auth/login'
  | '/api/auth/register'
  | '/api/auth/resend-verification'
  | '/api/auth/reset-password'
  | '/api/auth/verify-email'
  | '/api/client-error'
  | '/api/contact-message'
  | '/api/library'
  | `/api/library/${string}`
  | '/api/parent/children'
  | '/api/parent/link'
  | '/api/parent/submissions'
  | `/api/parent/submissions/${string}`
  | `/api/parent/submissions/${string}/pages`
  | `/api/parent/submissions/${string}/pages/${string}`
  | `/api/parent/submissions/${string}/submit`
  | '/api/patterns'
  | `/api/patterns/${string}`
  | '/api/people'
  | `/api/people/${string}/active`
  | `/api/people/${string}/approve`
  | `/api/people/${string}/reject`
  | `/api/people/${string}/reset-password`
  | `/api/people/${string}/sign-in-as`
  | '/api/people/me'
  | '/api/questions'
  | `/api/questions/${string}`
  | '/api/questions/review'
  | `/api/settings/admin/${string}`
  | '/api/settings/admin/email-env'
  | '/api/settings/admin/email-test'
  | '/api/settings/admin/list'
  | '/api/settings/public'
  | '/api/tutor/chapters'
  | '/api/tutor/onboard'
  | '/api/tutor/papers'
  | `/api/tutor/papers/${string}`
  | `/api/tutor/papers/${string}/assign`
  | '/api/tutor/review'
  | '/api/tutor/setup'
  | '/api/tutor/students'
  | `/api/tutor/submissions/${string}`
  | `/api/tutor/submissions/${string}/approve`
  | `/api/tutor/submissions/${string}/pages/${string}`
  | `/api/tutor/submissions/${string}/results`
  | '/api/user/admin/create'
  | '/api/user/admin/list'
  | '/api/user/admin/users'
  | `/api/user/admin/users/${string}`
  | `/api/user/admin/users/${string}/password`
  | '/api/user/change-password'
  | '/api/user/profile'
  | '/api/welcome'
  | `/api/welcome/${string}`;

/** Every route, for runtime assertions and tooling. */
export const API_ROUTES = [
  '/api/admin/roles',
  '/api/admin/summary',
  '/api/audit/list',
  '/api/auth/forgot-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/resend-verification',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/client-error',
  '/api/contact-message',
  '/api/library',
  '/api/parent/children',
  '/api/parent/link',
  '/api/parent/submissions',
  '/api/patterns',
  '/api/people',
  '/api/people/me',
  '/api/questions',
  '/api/questions/review',
  '/api/settings/admin/email-env',
  '/api/settings/admin/email-test',
  '/api/settings/admin/list',
  '/api/settings/public',
  '/api/tutor/chapters',
  '/api/tutor/onboard',
  '/api/tutor/papers',
  '/api/tutor/review',
  '/api/tutor/setup',
  '/api/tutor/students',
  '/api/user/admin/create',
  '/api/user/admin/list',
  '/api/user/admin/users',
  '/api/user/change-password',
  '/api/user/profile',
  '/api/welcome',
] as const;

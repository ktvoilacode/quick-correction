/**
 * Provider contributed by the AUTH layer.
 *
 * This file is the layer's ENTIRE contribution to the React tree. It replaces
 * a duplicated main.tsx that existed only to add this one wrapper.
 *
 * The <Providers> stack is rendered INSIDE BrowserRouter, which is what
 * AuthProvider needs: it redirects on sign-in and sign-out, and outside router
 * context every page under features/auth throws "useAuthContext must be used
 * within an AuthProvider".
 */
export { AuthProvider as Provider } from '@/features/auth';

export const order = 100;

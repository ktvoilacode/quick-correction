export const asset = (path: string): string => {
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (base === '/') return `/${cleanPath}`;
  return `${base}${cleanPath}`;
};
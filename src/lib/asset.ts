// Files in public/ (map data, flags, artwork) live under the site's base path,
// which is "/" locally and "/atlas-social-club/" on GitHub Pages.
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '');

import { createBrowserRouter, type Params } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './features/home/HomePage';
import { NotFound } from './features/stub/NotFound';

/** Browser-tab title for a route (see Layout). */
export type TitleFn = (params: Params<string>) => string;
const title = (t: string | TitleFn, extra?: { immersive?: boolean }) => ({ title: typeof t === 'string' ? () => t : t, ...extra });

const cap = (s?: string) => (s ?? '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Games load on demand: the homepage doesn't pay for the map engine.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage />, handle: title('Atlas Social Club · a little game about a big world') },
      {
        path: '/map-hunt',
        lazy: async () => ({ Component: (await import('./features/map-hunt/MapHuntPicker')).MapHuntPicker }),
        handle: title('Map Hunt'),
      },
      {
        path: '/map-hunt/:region',
        lazy: async () => ({ Component: (await import('./features/map-hunt/MapHuntPage')).MapHuntPage }),
        // the game takes the whole screen: no site header above the map
        handle: title((p) => `Map Hunt · ${p.region === 'world' ? 'World' : cap(p.region)}`, { immersive: true }),
      },
      {
        path: '/flag-spotter',
        lazy: async () => ({ Component: (await import('./features/flags/FlagSpotterHome')).FlagSpotterHome }),
        handle: title('Flag Spotter'),
      },
      {
        path: '/flag-spotter/album',
        lazy: async () => ({ Component: (await import('./features/flags/FlagAlbum')).FlagAlbum }),
        handle: title('Stamp album · Flag Spotter'),
      },
      {
        path: '/flag-spotter/:mode',
        lazy: async () => ({ Component: (await import('./features/flags/FlagQuiz')).FlagQuiz }),
        handle: title((p) => `${p.mode === 'find' ? 'Pick the flag' : 'Whose flag?'} · Flag Spotter`),
      },
      {
        path: '/capital-hop',
        lazy: async () => ({ Component: (await import('./features/capitals/CapitalHopHome')).CapitalHopHome }),
        handle: title('Capital Hop'),
      },
      {
        path: '/capital-hop/board',
        lazy: async () => ({ Component: (await import('./features/capitals/DeparturesBoard')).DeparturesBoard }),
        handle: title('Departures board · Capital Hop'),
      },
      {
        path: '/capital-hop/:mode',
        lazy: async () => ({ Component: (await import('./features/capitals/CapitalQuiz')).CapitalQuiz }),
        handle: title((p) => `${p.mode === 'to-country' ? 'Capital → country' : 'Country → capital'} · Capital Hop`),
      },
      {
        path: '/dare',
        lazy: async () => ({ Component: (await import('./features/dare/DarePage')).DarePage }),
        handle: title('Today’s dare', { immersive: true }),
      },
      {
        path: '/passport',
        lazy: async () => ({ Component: (await import('./features/passport/PassportPage')).PassportPage }),
        handle: title('My passport'),
      },
      {
        path: '/daily',
        lazy: async () => ({ Component: (await import('./features/daily/DailyPage')).DailyPage }),
        handle: title('Today’s voyage'),
      },
      { path: '*', element: <NotFound />, handle: title('Off the map') },
    ],
  },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

export default function App() {
  return <RouterProvider router={router} />;
}

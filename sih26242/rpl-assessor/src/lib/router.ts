import { useEffect, useState } from 'react';

export type Route =
  | 'dashboard'
  | 'declare'
  | 'mapping'
  | 'practical'
  | 'scoring'
  | 'profile'
  | 'consistency'
  | 'sync'
  | 'about';

const DEFAULT: Route = 'dashboard';

const VALID: Route[] = [
  'dashboard', 'declare', 'mapping', 'practical', 'scoring', 'profile', 'consistency', 'sync', 'about'
];

function parse(): Route {
  const raw = (typeof window === 'undefined' ? '' : window.location.hash).replace(/^#\/?/, '');
  return (VALID.includes(raw as Route) ? raw : DEFAULT) as Route;
}

export function navigate(route: Route) {
  if (typeof window !== 'undefined') window.location.hash = `#/${route}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

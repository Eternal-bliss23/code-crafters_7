import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from './App';
import { AppProvider } from './state';

describe('app smoke render', () => {
  it('renders the shell and, with no session, the assessor sign-in', () => {
    const html = renderToString(
      <AppProvider>
        <App />
      </AppProvider>
    );
    expect(html).toContain('RPL Assessor');
    expect(html).toContain('Assessor sign-in');
  });
});

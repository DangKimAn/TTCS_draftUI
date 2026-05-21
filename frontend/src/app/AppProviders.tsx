import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SocketProvider } from '../contexts/SocketContext';

interface AppProvidersProps {
  children: ReactNode;
}

function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <SocketProvider>
        {children}
      </SocketProvider>
    </BrowserRouter>
  );
}

export default AppProviders;

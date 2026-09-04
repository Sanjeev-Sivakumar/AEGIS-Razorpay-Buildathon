import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AegisProvider } from './context/AegisContext';
import { OSCommandCenter } from './pages/OSCommandCenter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AegisProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<OSCommandCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AegisProvider>
    </QueryClientProvider>
  );
};

export default App;

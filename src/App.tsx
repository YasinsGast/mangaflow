import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ReadingPreferencesProvider } from '@/contexts/ReadingPreferencesContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import HomePage from '@/pages/HomePage';
import MangaDetailPage from '@/pages/MangaDetailPage';
import LibraryPage from '@/pages/LibraryPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPanelPage from '@/pages/AdminPanelPage';
import AdminApprovalPage from '@/pages/AdminApprovalPage';
import FansubPage from '@/pages/FansubPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import ReaderPage from '@/pages/read/ReaderPage';
import UploadPage from '@/pages/UploadPage';
import RandomPage from '@/pages/RandomPage';
import CategoriesPage from '@/pages/CategoriesPage';
import CategoryDetailPage from '@/pages/CategoryDetailPage';
import RatingHistoryPage from '@/pages/RatingHistoryPage';
import RatingDashboardPage from '@/pages/RatingDashboardPage';
import '@/styles/globals.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <ReadingPreferencesProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/manga/:slug" element={<MangaDetailPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminPanelPage />} />
              <Route path="/admin/approval" element={<AdminApprovalPage />} />
              <Route path="/fansub" element={<FansubPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/read/:slug/:chapter" element={<ReaderPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/random" element={<RandomPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:categorySlug" element={<CategoryDetailPage />} />
              <Route path="/rating-history" element={<RatingHistoryPage />} />
              <Route path="/rating-dashboard" element={<RatingDashboardPage />} />
            </Routes>
          </BrowserRouter>
          
          {/* Toast Notifications */}
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 3000,
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#fff',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#8b5cf6',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ec4899',
                  secondary: '#fff',
                },
                style: {
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                },
              },
            }}
          />
        </ReadingPreferencesProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import getTheme from './theme';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IdeasPage from './pages/IdeasPage';
import IdeaDetailPage from './pages/IdeaDetailPage';
import FeaturesPage from './pages/FeaturesPage';
import TasksPage from './pages/TasksPage';
import BugsPage from './pages/BugsPage';
import SettingsPage from './pages/SettingsPage';

// Components
import Layout from './components/Layout';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// App Routes component (needs to be inside AuthProvider)
const AppRoutes = ({ darkMode, toggleDarkMode }) => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <Navigate to="/dashboard" replace />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ideas"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <IdeasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ideas/:ideaId"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <IdeaDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/features"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <FeaturesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <TasksPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <BugsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename="/manage-easy">
        <AuthProvider>
          <AppRoutes darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

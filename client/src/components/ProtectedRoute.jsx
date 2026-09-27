import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { FullPageSpinner } from './ui/Spinner';

/**
 * Gate for authenticated routes.
 *
 * Waits for the initial /me probe before deciding, otherwise a page refresh
 * would briefly render the redirect and bounce an authenticated user to
 * /login. The attempted path is preserved so login can return them there.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Restoring your session" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

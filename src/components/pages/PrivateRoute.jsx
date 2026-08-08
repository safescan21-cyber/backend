import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ role }) => {
  const { user } = useSelector((state) => state.auth ?? {});
  const location = useLocation();

  // Not logged in at all → send to login, remember where they wanted to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role for this section → bounce to their own dashboard
  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  // Authorized → render whatever nested route matched
  return <Outlet />;
};

export default PrivateRoute;
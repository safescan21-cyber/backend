// src/components/AuthInitializer.jsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetProfileQuery } from '../store/authApi';
import { setUser, logout } from '../store/authSlice';

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();

  const { data, error } = useGetProfileQuery();

  useEffect(() => {
    if (data) {
      dispatch(setUser(data));
    } else if (error) {
      // 401 here just means "no active session" — this is the normal,
      // expected case for a logged-out visitor, not a failure.
      dispatch(logout());
    }
  }, [data, error, dispatch]);

  // Don't block the entire app behind a full-screen loader. Render
  // children immediately; setUser/logout update auth state in the
  // background once the check resolves. Pages that need to gate on
  // auth (e.g. UserOrders) already check `user` before rendering
  // their own loading/logged-out state.
  return children;
};

export default AuthInitializer;
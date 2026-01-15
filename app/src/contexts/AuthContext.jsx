import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import apiService from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get the ID token
          const idToken = await firebaseUser.getIdToken();

          // Update state
          setUser(firebaseUser);
          setToken(idToken);

          // Set token in API service
          apiService.setToken(idToken);

          console.log('User signed in:', firebaseUser.email);
        } else {
          setUser(null);
          setToken(null);
          apiService.setToken(null);
          console.log('User signed out');
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful:', result.user.email);
      return result.user;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await firebaseSignOut(auth);
      console.log('Sign out successful');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    if (user) {
      try {
        const newToken = await user.getIdToken(true);
        setToken(newToken);
        apiService.setToken(newToken);
        return newToken;
      } catch (err) {
        console.error('Error refreshing token:', err);
        setError(err.message);
        throw err;
      }
    }
    return null;
  };

  const value = {
    user,
    token,
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useBugs = (featureId = null) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch bugs (optionally filtered by featureId)
  const fetchBugs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.listBugs(featureId);
      setBugs(response.bugs || []);
    } catch (err) {
      console.error('Error fetching bugs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  // Create a new bug
  const createBug = async (bugData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createBug(bugData);
      await fetchBugs(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error creating bug:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing bug
  const updateBug = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateBug(id, updates);
      await fetchBugs(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error updating bug:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a bug
  const deleteBug = async (id) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteBug(id);
      await fetchBugs(); // Refresh the list
    } catch (err) {
      console.error('Error deleting bug:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch bugs on mount or when featureId changes
  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  return {
    bugs,
    loading,
    error,
    fetchBugs,
    createBug,
    updateBug,
    deleteBug,
  };
};

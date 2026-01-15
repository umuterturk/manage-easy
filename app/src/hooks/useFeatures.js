import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useFeatures = (ideaId = null) => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch features (optionally filtered by ideaId)
  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.listFeatures(ideaId);
      setFeatures(response.features || []);
    } catch (err) {
      console.error('Error fetching features:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  // Create a new feature
  const createFeature = async (featureData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createFeature(featureData);
      await fetchFeatures(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error creating feature:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing feature
  const updateFeature = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateFeature(id, updates);
      await fetchFeatures(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error updating feature:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a feature
  const deleteFeature = async (id) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteFeature(id);
      await fetchFeatures(); // Refresh the list
    } catch (err) {
      console.error('Error deleting feature:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch features on mount or when ideaId changes
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return {
    features,
    loading,
    error,
    fetchFeatures,
    createFeature,
    updateFeature,
    deleteFeature,
  };
};

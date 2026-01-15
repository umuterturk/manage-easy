import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useIdeas = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all ideas
  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.listIdeas();
      setIdeas(response.ideas || []);
    } catch (err) {
      console.error('Error fetching ideas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new idea
  const createIdea = async (ideaData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createIdea(ideaData);
      await fetchIdeas(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error creating idea:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing idea
  const updateIdea = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateIdea(id, updates);
      await fetchIdeas(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error updating idea:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an idea
  const deleteIdea = async (id) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteIdea(id);
      await fetchIdeas(); // Refresh the list
    } catch (err) {
      console.error('Error deleting idea:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch ideas on mount
  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return {
    ideas,
    loading,
    error,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
  };
};

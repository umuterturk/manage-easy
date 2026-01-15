import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useTasks = (featureId = null) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch tasks (optionally filtered by featureId)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.listTasks(featureId);
      setTasks(response.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  // Create a new task
  const createTask = async (taskData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createTask(taskData);
      await fetchTasks(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing task
  const updateTask = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateTask(id, updates);
      await fetchTasks(); // Refresh the list
      return response;
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a task
  const deleteTask = async (id) => {
    setLoading(true);
    setError(null);

    try {
      await apiService.deleteTask(id);
      await fetchTasks(); // Refresh the list
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks on mount or when featureId changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
};

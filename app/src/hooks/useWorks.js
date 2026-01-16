import { useState, useCallback, useEffect } from 'react';
import ApiService from '../services/api';

const useWorks = (featureId, ideaId) => {
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWorks = useCallback(async () => {
        setLoading(true);
        try {
            const response = await ApiService.listWorks(featureId, ideaId);
            if (response.success) {
                setWorks(response.works);
            }
        } catch (err) {
            setError(err);
            console.error('Error fetching works:', err);
        } finally {
            setLoading(false);
        }
    }, [featureId, ideaId]);

    useEffect(() => {
        fetchWorks();
    }, [fetchWorks]);

    const createWork = async (workData) => {
        try {
            const response = await ApiService.createWork(workData);
            if (response.success) {
                await fetchWorks();
                return response;
            }
        } catch (err) {
            console.error('Error creating work:', err);
            throw err;
        }
    };

    const updateWork = async (id, updates) => {
        try {
            // Optimistic update
            setWorks((prev) =>
                prev.map((work) =>
                    work.id === id ? { ...work, ...updates } : work
                )
            );

            const response = await ApiService.updateWork(id, updates);
            if (!response.success) {
                // Revert on failure
                await fetchWorks();
            }
            return response;
        } catch (err) {
            console.error('Error updating work:', err);
            await fetchWorks(); // Revert
            throw err;
        }
    };

    const deleteWork = async (id, ownerId) => {
        try {
            // Optimistic updatet
            setWorks((prev) => prev.filter((work) => work.id !== id));

            const response = await ApiService.deleteWork(id, ownerId);
            if (!response.success) {
                await fetchWorks();
            }
            return response;
        } catch (err) {
            console.error('Error deleting work:', err);
            await fetchWorks();
            throw err;
        }
    };

    return {
        works,
        loading,
        error,
        createWork,
        updateWork,
        deleteWork,
        refreshWorks: fetchWorks,
    };
};

export default useWorks;

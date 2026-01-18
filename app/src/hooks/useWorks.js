import { useState, useCallback, useEffect } from 'react';
import { collection, collectionGroup, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import ApiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const useWorks = (featureId, ideaId) => {
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setWorks([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let q;

        try {
            // Match server-side logic: use collectionGroup if filtering by featureId or ideaId
            if (featureId || ideaId) {
                // Determine base query based on provided filters
                let constraints = [where("archived", "==", false)];

                if (featureId) {
                    constraints.push(where("featureId", "==", featureId));
                }
                if (ideaId) {
                    constraints.push(where("ideaId", "==", ideaId));
                }

                q = query(
                    collectionGroup(db, 'works'),
                    ...constraints
                );
            } else {
                // Fallback to my works
                q = query(
                    collection(db, 'users', user.uid, 'works'),
                    where("archived", "==", false)
                );
            }

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const newWorks = snapshot.docs.map(doc => {
                    // Extract ownerId from parent path if possible, or default to current user
                    // Path format: users/{ownerId}/works/{workId}
                    const pathSegments = doc.ref.path.split('/');
                    const ownerId = pathSegments[1] || user.uid;

                    return {
                        id: doc.id,
                        ownerId,
                        ...doc.data()
                    };
                });

                // Client-side sorting to match server logic
                // Sort by order (ascending), fallback to createdAt
                newWorks.sort((a, b) => {
                    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                    if (orderA !== orderB) return orderA - orderB;

                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                    return dateA - dateB;
                });

                setWorks(newWorks);
                setLoading(false);
            }, (err) => {
                console.error('Error listening to works:', err);
                setError(err);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up works listener:', err);
            setError(err);
            setLoading(false);
        }
    }, [featureId, ideaId, user]);

    const createWork = async (workData) => {
        try {
            const response = await ApiService.createWork(workData);
            return response;
        } catch (err) {
            console.error('Error creating work:', err);
            throw err;
        }
    };

    const updateWork = async (id, updates) => {
        try {
            // No need for optimistic update as onSnapshot will handle it fast enough usually
            // But we can keep it if we want instant feedback before server ack
            // For now, let's rely on onSnapshot which is "optimistic" locally with Firestore SDK

            const response = await ApiService.updateWork(id, updates);
            return response;
        } catch (err) {
            console.error('Error updating work:', err);
            throw err;
        }
    };

    const deleteWork = async (id, ownerId) => {
        try {
            const response = await ApiService.deleteWork(id, ownerId);
            return response;
        } catch (err) {
            console.error('Error deleting work:', err);
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
        refreshWorks: () => { }, // No-op as it's real-time now
    };
};

export default useWorks;

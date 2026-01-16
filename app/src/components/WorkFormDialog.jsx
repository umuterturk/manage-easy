import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    CircularProgress,
    Autocomplete,
} from '@mui/material';
import { STATUS_OPTIONS } from '../utils/constants';

const WorkFormDialog = ({ open, onClose, onSubmit, work = null, features = [], ideaId, loading = false }) => {
    const [formData, setFormData] = useState({
        featureId: '',
        title: '',
        description: '',
        status: 'TODO',
        type: 'TASK', // Default type
    });

    const [errors, setErrors] = useState({});

    // Reset form when dialog opens/closes or work changes
    useEffect(() => {
        if (open) {
            if (work) {
                setFormData({
                    featureId: work.featureId || '',
                    title: work.title || '',
                    description: work.description || '',
                    status: work.status || 'TODO',
                    type: work.type || 'TASK',
                });
            } else {
                setFormData({
                    featureId: '',
                    title: '',
                    description: '',
                    status: 'TODO',
                    type: 'TASK',
                });
            }
            setErrors({});
        }
    }, [open, work]);

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: '',
            }));
        }
    };

    const handleFeatureChange = (event, value) => {
        setFormData((prev) => ({
            ...prev,
            featureId: value?.id || '',
        }));
        if (errors.featureId) {
            setErrors((prev) => ({
                ...prev,
                featureId: '',
            }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        try {
            await onSubmit(formData);
            onClose();
        } catch (err) {
            console.error('Error submitting form:', err);
        }
    };

    const selectedFeature = features.find((f) => f.id === formData.featureId);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{work ? 'Edit Item' : 'Create New Item'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Type"
                        fullWidth
                        select
                        value={formData.type}
                        onChange={handleChange('type')}
                        disabled={loading}
                    >
                        <MenuItem value="TASK">Task</MenuItem>
                        <MenuItem value="BUG">Bug</MenuItem>
                    </TextField>

                    <TextField
                        label="Title"
                        fullWidth
                        required
                        value={formData.title}
                        onChange={handleChange('title')}
                        error={Boolean(errors.title)}
                        helperText={errors.title}
                        disabled={loading}
                    />

                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={handleChange('description')}
                        disabled={loading}
                    />

                    <Autocomplete
                        options={features}
                        getOptionLabel={(option) => option.title}
                        value={selectedFeature || null}
                        onChange={handleFeatureChange}
                        disabled={loading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Feature (optional)"
                                helperText="Assign this item to a feature"
                            />
                        )}
                    />

                    <TextField
                        label="Status"
                        fullWidth
                        select
                        value={formData.status}
                        onChange={handleChange('status')}
                        disabled={loading}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Saving...' : work ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WorkFormDialog;

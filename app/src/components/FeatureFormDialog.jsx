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
} from '@mui/material';
import { STATUS_OPTIONS } from '../utils/constants';

const FeatureFormDialog = ({ open, onClose, onSubmit, feature = null, ideaId, loading = false }) => {
  const [formData, setFormData] = useState({
    ideaId: ideaId || '',
    title: '',
    description: '',
    status: 'CREATED',
  });

  const [errors, setErrors] = useState({});

  // Reset form when dialog opens/closes or feature changes
  useEffect(() => {
    if (open) {
      if (feature) {
        setFormData({
          ideaId: feature.ideaId || ideaId || '',
          title: feature.title || '',
          description: feature.description || '',
          status: feature.status || 'CREATED',
        });
      } else {
        setFormData({
          ideaId: ideaId || '',
          title: '',
          description: '',
          status: 'CREATED',
        });
      }
      setErrors({});
    }
  }, [open, feature, ideaId]);

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

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.ideaId) {
      newErrors.ideaId = 'Idea is required';
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{feature ? 'Edit Feature' : 'Create New Feature'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
          {loading ? 'Saving...' : feature ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeatureFormDialog;

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useFeatures } from '../hooks/useFeatures';
import FeatureCard from '../components/FeatureCard';
import FeatureFormDialog from '../components/FeatureFormDialog';

const FeaturesPage = () => {
  const { ideaId } = useParams();
  const { features, loading, error, createFeature, updateFeature, deleteFeature } = useFeatures(ideaId);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  const handleOpenCreateDialog = () => {
    setSelectedFeature(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (feature) => {
    setSelectedFeature(feature);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setSelectedFeature(null);
  };

  const handleOpenDeleteDialog = (feature) => {
    setSelectedFeature(feature);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedFeature(null);
  };

  const handleSubmitForm = async (formData) => {
    setActionLoading(true);
    try {
      if (selectedFeature) {
        await updateFeature(selectedFeature.id, formData);
        setSnackbar({ open: true, message: 'Feature updated successfully!', severity: 'success' });
      } else {
        // Ensure ideaId is included if we are in the context of an idea
        const featureData = ideaId ? { ...formData, ideaId } : formData;
        await createFeature(featureData);
        setSnackbar({ open: true, message: 'Feature created successfully!', severity: 'success' });
      }
      handleCloseFormDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedFeature) return;

    setActionLoading(true);
    try {
      await deleteFeature(selectedFeature.id);
      setSnackbar({ open: true, message: 'Feature deleted successfully!', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto' }}>
      <Container maxWidth="xl" sx={{ mt: 6, mb: 10 }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 4,
        }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            New Feature
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {loading && features.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : features.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Box
              component="img"
              src="/assets/empty_ideas.png"
              alt="No features yet"
              sx={{
                width: '100%',
                maxWidth: 400,
                mb: 4,
                filter: (theme) => theme.palette.mode === 'dark' ? 'drop-shadow(0 0 20px rgba(129, 140, 248, 0.15))' : 'none',
                animation: 'float 6s ease-in-out infinite'
              }}
            />
            <style>
              {`
                @keyframes float {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-20px); }
                  100% { transform: translateY(0px); }
                }
              `}
            </style>
            <Typography variant="h3" color="text.primary" gutterBottom sx={{ fontWeight: 800 }}>
              No features found
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6, maxWidth: 500, fontWeight: 400 }}>
              Start defining what makes your project great.
            </Typography>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                borderWidth: 2,
                '&:hover': { borderWidth: 2 },
                borderRadius: '12px',
                px: 4
              }}
            >
              Create Feature
            </Button>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {features.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.id}>
                <FeatureCard feature={feature} onEdit={handleOpenEditDialog} onDelete={handleOpenDeleteDialog} />
              </Grid>
            ))}
          </Grid>
        )}

        <FeatureFormDialog
          open={formDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleSubmitForm}
          feature={selectedFeature}
          loading={actionLoading}
          ideaId={ideaId}
        />

        <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Delete Feature</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedFeature?.title}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={20} /> : null}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default FeaturesPage;

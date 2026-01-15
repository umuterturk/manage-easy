import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Fab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useIdeas } from '../hooks/useIdeas';
import IdeaCard from '../components/IdeaCard';
import IdeaFormDialog from '../components/IdeaFormDialog';

const IdeasPage = () => {
  const { ideas, loading, error, createIdea, updateIdea, deleteIdea } = useIdeas();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  const handleOpenCreateDialog = () => {
    setSelectedIdea(null);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (idea) => {
    setSelectedIdea(idea);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setSelectedIdea(null);
  };

  const handleOpenDeleteDialog = (idea) => {
    setSelectedIdea(idea);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedIdea(null);
  };

  const handleSubmitForm = async (formData) => {
    setActionLoading(true);
    try {
      if (selectedIdea) {
        await updateIdea(selectedIdea.id, formData);
        setSnackbar({ open: true, message: 'Idea updated successfully!', severity: 'success' });
      } else {
        await createIdea(formData);
        setSnackbar({ open: true, message: 'Idea created successfully!', severity: 'success' });
      }
      handleCloseFormDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedIdea) return;

    setActionLoading(true);
    try {
      await deleteIdea(selectedIdea.id);
      setSnackbar({ open: true, message: 'Idea deleted successfully!', severity: 'success' });
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            Ideas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your project ideas and their features
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && ideas.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : ideas.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No ideas yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Get started by creating your first idea
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
            Create Idea
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {ideas.map((idea) => (
            <Grid item xs={12} sm={6} md={4} key={idea.id}>
              <IdeaCard idea={idea} onEdit={handleOpenEditDialog} onDelete={handleOpenDeleteDialog} />
            </Grid>
          ))}
        </Grid>
      )}

      {ideas.length > 0 && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleOpenCreateDialog}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      <IdeaFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        onSubmit={handleSubmitForm}
        idea={selectedIdea}
        loading={actionLoading}
      />

      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Idea</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedIdea?.title}"? This action cannot be undone.
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
  );
};

export default IdeasPage;

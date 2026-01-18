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
    <Container maxWidth="xl" sx={{ mt: 6, mb: 10 }}>
      {/* Premium Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        mb: 8,
        position: 'relative'
      }}>
        <Box>
          <Typography
            variant="h1"
            sx={{
              background: (theme) => theme.palette.gradient.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            My Ideas
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 400 }}>
            Where great projects begin.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
          sx={{
            height: 56,
            px: 4,
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: 700,
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 20px 25px -5px rgba(79, 70, 229, 0.4)',
            }
          }}
        >
          New Idea
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      {loading && ideas.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      ) : ideas.length === 0 ? (
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
            alt="No ideas yet"
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
            The canvas is empty
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, maxWidth: 500, fontWeight: 400 }}>
            Capture your next big project here. Every great milestone starts as a simple thought.
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
            Start Your Journey
          </Button>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {ideas.map((idea) => (
            <Grid item xs={12} sm={6} md={4} key={idea.id}>
              <IdeaCard idea={idea} onEdit={handleOpenEditDialog} onDelete={handleOpenDeleteDialog} />
            </Grid>
          ))}
        </Grid>
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

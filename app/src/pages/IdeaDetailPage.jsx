import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Avatar,
  AvatarGroup,
  IconButton,
  TextField,
  Snackbar,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TaskIcon from '@mui/icons-material/Task';
import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';
import FilterListIcon from '@mui/icons-material/FilterList';

import { useIdeas } from '../hooks/useIdeas';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import ApiService from '../services/api';
import UserSelectDialog from '../components/UserSelectDialog';

const IdeaDetailPage = () => {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setBreadcrumbs, setHeaderContent } = useLayout();
  const { ideas, loading: ideasLoading, error: ideasError, updateIdea } = useIdeas();

  const [idea, setIdea] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Title/Description Editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // User assignment
  const [assignUsersOpen, setAssignUsersOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // Tab state
  const currentTab = location.pathname.includes('/features') ? 1 : 0;
  const [showFilters, setShowFilters] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('features') || searchParams.get('tags')) {
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await ApiService.listUsers();
        if (response.success) {
          setAllUsers(response.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (ideas.length > 0) {
      const foundIdea = ideas.find((i) => i.id === ideaId);
      if (foundIdea) {
        setIdea(foundIdea);
        localStorage.setItem('lastIdeaId', ideaId);
      } else {
        navigate('/ideas');
      }
    }
  }, [ideas, ideaId, navigate]);

  useEffect(() => {
    if (idea) {
      setBreadcrumbs(
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ '& .MuiBreadcrumbs-separator': { color: 'text.secondary' } }}>
          <Link
            underline="hover"
            color="text.secondary"
            onClick={() => navigate('/ideas')}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            Ideas
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {idea.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            <AvatarGroup max={4} sx={{ mr: 1, '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.875rem' } }}>
              {(idea.assignedUserIds || []).map(uid => {
                const u = allUsers.find(user => user.uid === uid);
                return (
                  <Avatar key={uid} alt={u?.displayName || 'Unknown'} src={u?.photoURL}>
                    {(u?.displayName || '?').charAt(0)}
                  </Avatar>
                );
              })}
            </AvatarGroup>
            <IconButton size="small" onClick={() => setAssignUsersOpen(true)}>
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Breadcrumbs>
      );

      // Inject Tabs into Header
      setHeaderContent(
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 100,
                minHeight: 48,
                py: 0
              },
            }}
          >
            <Tab icon={<TaskIcon />} iconPosition="start" label="Works" />
            <Tab icon={<FeaturedPlayListIcon />} iconPosition="start" label="Features" />
          </Tabs>
        </Box>
      );
    }
    return () => {
      setBreadcrumbs(null);
      setHeaderContent(null);
    };
  }, [idea, navigate, setBreadcrumbs, setHeaderContent, allUsers, currentTab, showFilters]);

  const handleTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate(`/ideas/${ideaId}/works`);
    } else {
      navigate(`/ideas/${ideaId}/features`);
    }
  };

  const handleAssignUsers = async (userIds) => {
    try {
      await updateIdea(ideaId, { assignedUserIds: userIds, ownerId: idea?.createdBy });
      setIdea(prev => ({ ...prev, assignedUserIds: userIds }));
      setSnackbar({ open: true, message: 'Users assigned successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  // Editing Handlers
  const handleTitleClick = () => {
    setEditedTitle(idea.title);
    setEditingTitle(true);
  };
  const handleDescriptionClick = () => {
    setEditedDescription(idea.description || '');
    setEditingDescription(true);
  };
  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== idea.title) {
      try {
        await updateIdea(ideaId, { title: editedTitle.trim(), ownerId: idea?.createdBy });
        setIdea({ ...idea, title: editedTitle.trim() });
        setSnackbar({ open: true, message: 'Title updated successfully!', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
      }
    }
    setEditingTitle(false);
  };
  const handleDescriptionSave = async () => {
    if (editedDescription !== idea.description) {
      try {
        await updateIdea(ideaId, { description: editedDescription, ownerId: idea?.createdBy });
        setIdea({ ...idea, description: editedDescription });
        setSnackbar({ open: true, message: 'Description updated successfully!', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
      }
    }
    setEditingDescription(false);
  };
  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSave();
    else if (e.key === 'Escape') setEditingTitle(false);
  };
  const handleDescriptionKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDescriptionSave(); }
    else if (e.key === 'Escape') setEditingDescription(false);
  };
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  if (ideasLoading && !idea) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (ideasError) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{ideasError}</Alert>
      </Container>
    );
  }

  if (!idea) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Idea not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Outlet context={{ idea, allUsers, showFilters, setShowFilters }} />
      </Box>

      <UserSelectDialog
        open={assignUsersOpen}
        onClose={() => setAssignUsersOpen(false)}
        users={allUsers}
        assignedUserIds={idea?.assignedUserIds || []}
        onSave={handleAssignUsers}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IdeaDetailPage;

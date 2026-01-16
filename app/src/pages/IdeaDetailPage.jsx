import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Avatar,
  AvatarGroup,
  IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UserSelectDialog from '../components/UserSelectDialog';
import ApiService from '../services/api';
import TaskIcon from '@mui/icons-material/Task';
import BugReportIcon from '@mui/icons-material/BugReport';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useIdeas } from '../hooks/useIdeas';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { useFeatures } from '../hooks/useFeatures';
import useWorks from '../hooks/useWorks';
import WorkCard from '../components/WorkCard';
import WorkFormDialog from '../components/WorkFormDialog';
import { STATUS } from '../utils/constants';

const CARD_HEIGHT = 120; // Fixed card height in pixels
const CARD_GAP = 8; // Gap between cards

// Draggable card wrapper
const DraggableCard = ({
  item,
  featureName,
  onEdit,
  onDelete,
  onUpdate,
  onDragStart,
  isDragging,
  isPlaceholder,
  autoFocus,
  isDraft,
  onSaveDraft,
  onCancelDraft,
}) => {
  const handleMouseDown = (e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      window.getComputedStyle(e.target).cursor === 'pointer'
    ) return;

    e.preventDefault();
    onDragStart(e, item);
  };

  if (isPlaceholder) {
    return (
      <Box
        sx={{
          height: CARD_HEIGHT,
          mb: `${CARD_GAP}px`,
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 1,
          bgcolor: 'action.hover',
          transition: 'all 200ms ease',
        }}
      />
    );
  }

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        height: CARD_HEIGHT,
        mb: `${CARD_GAP}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0 : 1,
        transition: isDragging ? 'none' : 'transform 200ms ease, opacity 200ms ease',
        '& > *': {
          height: '100%',
        },
      }}
    >
      <WorkCard
        work={item}
        featureName={featureName}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdate={onUpdate}
        autoFocus={autoFocus}
        isDraft={isDraft}
        onSaveDraft={onSaveDraft}
        onCancelDraft={onCancelDraft}
      />
    </Box>
  );
};

// Kanban Column Component
const KanbanColumn = ({
  status,
  title,
  items,
  count,
  color,
  getFeatureName,
  onEdit,
  onDelete,
  onUpdateWork,
  onDragStart,
  dragState,
  columnRef,
  onLaneDoubleClick,
  autoFocusWorkId,
  onSaveDraft,
  onCancelDraft,
}) => {
  const isDropTarget = dragState?.targetStatus === status;

  return (
    <Box
      sx={{
        minWidth: 300,
        maxWidth: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
      }}
    >
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: isDropTarget ? 'action.hover' : 'background.paper',
          transition: 'background-color 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            {title}
          </Typography>
          <Chip label={count} size="small" color={color} />
        </Box>

        <Box
          ref={columnRef}
          data-status={status}
          onDoubleClick={(e) => {
            if (e.target === e.currentTarget) {
              onLaneDoubleClick(status);
            }
          }}
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 1,
            minHeight: 100,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'divider',
              borderRadius: '4px',
            },
          }}
        >
          {items.map((item) => (
            <DraggableCard
              key={item.isPlaceholder ? 'placeholder' : item.uniqueId}
              item={item.data}
              featureName={item.isPlaceholder ? null : getFeatureName(item.data?.featureId)}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdateWork}
              onDragStart={onDragStart}
              isDragging={dragState?.activeItemId === item.data?.id}
              isPlaceholder={item.isPlaceholder}
              autoFocus={autoFocusWorkId === item.data?.id}
              isDraft={item.isDraft}
              onSaveDraft={(title) => onSaveDraft(title, status)}
              onCancelDraft={onCancelDraft}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

const IdeaDetailPage = () => {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setBreadcrumbs } = useLayout();
  const { ideas, loading: ideasLoading, error: ideasError, updateIdea } = useIdeas();
  const { features } = useFeatures(ideaId);

  // Use unified works hook
  const { works, createWork, updateWork, deleteWork } = useWorks(null, ideaId); // Pass ideaId to filter

  const [autoFocusWorkId, setAutoFocusWorkId] = useState(null);
  const [draftWork, setDraftWork] = useState(null);

  const [idea, setIdea] = useState(null);
  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Default type for new work when opening dialog from SpeedDial
  const [defaultWorkType, setDefaultWorkType] = useState('TASK');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // User assignment state
  const [assignUsersOpen, setAssignUsersOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

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

  const handleAssignUsers = async (userIds) => {
    try {
      await updateIdea(ideaId, { assignedUserIds: userIds, ownerId: idea?.createdBy });
      setIdea(prev => ({ ...prev, assignedUserIds: userIds }));
      setSnackbar({ open: true, message: 'Users assigned successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  // Drag state: { activeItemId, sourceStatus, targetStatus, targetIndex }
  const [dragState, setDragState] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [optimisticOrder, setOptimisticOrder] = useState(null);

  // Refs for columns
  const columnRefs = useRef({});

  // Filter works for this idea (already done by hook but good to be safe if hook changes)
  const ideaWorks = optimisticOrder
    ? works.map((work) => {
      const optimisticIndex = optimisticOrder.items.findIndex((item) => item.id === work.id);
      if (optimisticIndex !== -1) {
        return { ...work, order: optimisticIndex, status: optimisticOrder.status };
      }
      return work;
    })
    : works;

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
    }
    return () => setBreadcrumbs(null);
  }, [idea, navigate, setBreadcrumbs]);

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      setDragPosition({ x: e.clientX, y: e.clientY });

      // Find which column we're over
      let targetStatus = null;
      let targetIndex = 0;

      for (const [status, ref] of Object.entries(columnRefs.current)) {
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          targetStatus = status;
          // Calculate target index based on Y position
          const relativeY = e.clientY - rect.top + ref.scrollTop;
          targetIndex = Math.max(0, Math.floor(relativeY / (CARD_HEIGHT + CARD_GAP)));

          // Get current items in this column (excluding dragged item)
          const columnItems = getBaseColumnItems(status).filter(
            (item) => item.data.id !== dragState.activeItemId
          );
          targetIndex = Math.min(targetIndex, columnItems.length);
          break;
        }
      }

      if (targetStatus && (dragState.targetStatus !== targetStatus || dragState.targetIndex !== targetIndex)) {
        setDragState((prev) => ({
          ...prev,
          targetStatus,
          targetIndex,
        }));
      }
    };

    const handleMouseUp = async () => {
      if (!dragState || dragState.targetStatus === null) {
        setDragState(null);
        return;
      }

      const { activeItemId, sourceStatus, targetStatus, targetIndex } = dragState;

      // Build the new order with the dragged item inserted
      const draggedItemData = ideaWorks.find((w) => w.id === activeItemId);

      if (!draggedItemData) {
        setDragState(null);
        return;
      }

      // Get items in target column without the dragged item
      const targetItems = getBaseColumnItems(targetStatus).filter(
        (item) => item.data.id !== activeItemId
      );

      // Insert dragged item at target index
      const newItems = [...targetItems];
      const draggedItem = {
        uniqueId: `work-${activeItemId}-${targetStatus}`,
        type: 'work',
        data: draggedItemData,
      };
      newItems.splice(Math.min(targetIndex, newItems.length), 0, draggedItem);

      // Apply optimistic update
      setOptimisticOrder({
        status: targetStatus,
        items: newItems.map((item) => ({ id: item.data.id })),
      });

      setDragState(null);

      try {
        if (sourceStatus === targetStatus) {
          // Same lane sorting
          const updatePromises = newItems.map((item, index) => {
            // Only update if order changed
            if (item.data.order !== index) {
              return updateWork(item.data.id, { order: index, ownerId: idea?.createdBy });
            }
            return Promise.resolve();
          });
          await Promise.all(updatePromises);
        } else {
          // Cross-lane move
          const updatePromises = newItems.map((item, index) => {
            if (item.data.id === activeItemId) {
              return updateWork(item.data.id, { status: targetStatus, order: index, ownerId: idea?.createdBy });
            } else {
              // Only update if order changed
              if (item.data.order !== index) {
                return updateWork(item.data.id, { order: index, ownerId: idea?.createdBy });
              }
              return Promise.resolve();
            }
          });
          await Promise.all(updatePromises);
          setSnackbar({ open: true, message: `Item moved successfully!`, severity: 'success' });
        }
      } catch (err) {
        setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
      } finally {
        setOptimisticOrder(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, ideaWorks, updateWork]);

  const handleOpenWorkDialog = (work = null, type = 'TASK') => {
    setSelectedItem(work);
    // If editing, use existing type. If creating, use passed type.
    if (!work) {
      setSelectedItem({ type });
    }
    setWorkDialogOpen(true);
  };

  const handleCloseWorkDialog = () => {
    setWorkDialogOpen(false);
    setSelectedItem(null);
  };

  const handleOpenDeleteDialog = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSubmitWork = async (formData) => {
    setActionLoading(true);
    try {
      const workData = {
        ...formData,
        ideaId,
      };

      if (selectedItem && selectedItem.id) {
        await updateWork(selectedItem.id, { ...workData, ownerId: idea?.createdBy });
        setSnackbar({ open: true, message: 'Item updated successfully!', severity: 'success' });
      } else {
        await createWork({ ...workData, creatorName: user?.displayName || user?.email || '', ownerId: idea?.createdBy });
        setSnackbar({ open: true, message: 'Item created successfully!', severity: 'success' });
      }
      handleCloseWorkDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await deleteWork(selectedItem.id, idea?.createdBy);
      setSnackbar({ open: true, message: 'Item deleted successfully!', severity: 'success' });
      handleCloseDeleteDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLaneDoubleClick = (status) => {
    if (draftWork) return;

    const existingItems = getBaseColumnItems(status);
    const emptyWork = existingItems.find(item =>
      (!item.data.title || item.data.title.trim() === '')
    );

    if (emptyWork) {
      setAutoFocusWorkId(emptyWork.data.id);
      setTimeout(() => setAutoFocusWorkId(null), 1000);
      return;
    }

    setDraftWork({ status });
  };

  const handleSaveDraft = async (title, status) => {
    try {
      const workData = {
        title,
        description: '',
        status,
        ideaId,
        type: 'TASK', // Default to Task for quick add
        creatorName: user?.displayName || user?.email || '',
      };

      await createWork({ ...workData, ownerId: idea?.createdBy });
      setDraftWork(null);
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    }
  };

  const handleCancelDraft = () => {
    setDraftWork(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditingTitle(false);
    }
  };

  const handleDescriptionKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditingDescription(false);
    }
  };

  const getFeatureName = (featureId) => {
    const feature = features.find((f) => f.id === featureId);
    return feature?.title || null;
  };

  const handleDragStart = (e, item) => {
    const status = item.status;
    setDragState({
      activeItemId: item.id,
      sourceStatus: status,
      targetStatus: status,
      targetIndex: getBaseColumnItems(status).findIndex((i) => i.data.id === item.id),
    });
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const columns = [
    { status: STATUS.CREATED, title: 'Created', color: 'default' },
    { status: STATUS.TODO, title: 'To Do', color: 'warning' },
    { status: STATUS.IN_PROGRESS, title: 'In Progress', color: 'info' },
    { status: STATUS.DONE, title: 'Done', color: 'success' },
  ];

  const getBaseColumnItems = (status) => {
    const items = ideaWorks
      .filter((work) => work.status === status)
      .map((work) => ({
        uniqueId: `work-${work.id}-${status}`,
        type: 'work',
        data: work,
      }))
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

    // Inject draft task at the end if status matches
    if (draftWork && draftWork.status === status) {
      items.push({
        uniqueId: 'draft-work',
        type: 'work',
        data: { id: 'draft-id', title: '', status: status, type: 'TASK' }, // Default draft to TASK
        isDraft: true
      });
    }

    return items;
  };

  const getColumnItemsWithPlaceholder = (status) => {
    let items = getBaseColumnItems(status);

    if (dragState && dragState.targetStatus === status) {
      // Remove the dragged item from the list
      items = items.filter((item) => item.data.id !== dragState.activeItemId);

      // Insert placeholder at target index
      const placeholder = {
        uniqueId: 'placeholder',
        type: 'work',
        data: null,
        isPlaceholder: true,
      };
      items.splice(Math.min(dragState.targetIndex, items.length), 0, placeholder);
    } else if (dragState && dragState.sourceStatus === status) {
      // Remove dragged item from source column
      items = items.filter((item) => item.data.id !== dragState.activeItemId);
    }

    return items;
  };

  const getDraggedItemData = () => {
    if (!dragState) return null;
    const { activeItemId } = dragState;
    return ideaWorks.find((w) => w.id === activeItemId);
  };

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

  const draggedItemData = getDraggedItemData();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


      <Container maxWidth="xl" sx={{ flexGrow: 1, overflow: 'hidden', pb: 3 }}>
        {ideaWorks.length === 0 ? (
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
              No items yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get started by creating your first task or bug
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Use the + button below to add items
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              height: '100%',
              pb: 2,
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'divider',
                borderRadius: '4px',
              },
            }}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                status={column.status}
                title={column.title}
                color={column.color}
                items={getColumnItemsWithPlaceholder(column.status)}
                count={ideaWorks.filter((w) => w.status === column.status).length}
                getFeatureName={getFeatureName}
                onEdit={handleOpenWorkDialog}
                onDelete={handleOpenDeleteDialog}
                onUpdateWork={updateWork}
                onDragStart={handleDragStart}
                dragState={dragState}
                columnRef={(el) => (columnRefs.current[column.status] = el)}
                onLaneDoubleClick={handleLaneDoubleClick}
                autoFocusWorkId={autoFocusWorkId}
                onSaveDraft={handleSaveDraft}
                onCancelDraft={handleCancelDraft}
              />
            ))}
          </Box>
        )}
      </Container>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Create SpeedDial"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<BugReportIcon color="error" />}
          tooltipTitle="Report Bug"
          onClick={() => handleOpenWorkDialog(null, 'BUG')}
        />
        <SpeedDialAction
          icon={<TaskIcon color="primary" />}
          tooltipTitle="Create Task"
          onClick={() => handleOpenWorkDialog(null, 'TASK')}
        />
      </SpeedDial>

      {/* Work Form Dialog */}
      <WorkFormDialog
        open={workDialogOpen}
        onClose={handleCloseWorkDialog}
        onSubmit={handleSubmitWork}
        work={selectedItem}
        features={features}
        ideaId={ideaId}
        loading={actionLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this item?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={actionLoading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Dragged Card Overlay */}
      {dragState && draggedItemData && (
        <Box
          sx={{
            position: 'fixed',
            left: dragPosition.x,
            top: dragPosition.y,
            width: 284, // Column width (300) - padding (16)
            height: CARD_HEIGHT,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'translate(-50%, -50%) rotate(3deg)',
            opacity: 0.9,
          }}
        >
          <WorkCard
            work={draggedItemData}
            featureName={getFeatureName(draggedItemData.featureId)}
            onEdit={() => { }}
            onDelete={() => { }}
            onUpdate={() => { }}
          />
        </Box>
      )}

      <UserSelectDialog
        open={assignUsersOpen}
        onClose={() => setAssignUsersOpen(false)}
        users={allUsers}
        assignedUserIds={idea?.assignedUserIds || []}
        onSave={handleAssignUsers}
      />
    </Box>
  );
};

export default IdeaDetailPage;

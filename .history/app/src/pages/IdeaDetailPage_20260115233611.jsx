import { useState, useEffect } from 'react';
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
  IconButton,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskIcon from '@mui/icons-material/Task';
import BugReportIcon from '@mui/icons-material/BugReport';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIdeas } from '../hooks/useIdeas';
import { useAuth } from '../contexts/AuthContext';
import { useFeatures } from '../hooks/useFeatures';
import { useTasks } from '../hooks/useTasks';
import { useBugs } from '../hooks/useBugs';
import StatusBadge from '../components/StatusBadge';
import TaskCard from '../components/TaskCard';
import BugCard from '../components/BugCard';
import TaskFormDialog from '../components/TaskFormDialog';
import BugFormDialog from '../components/BugFormDialog';
import { STATUS } from '../utils/constants';

// Sortable item wrapper
const SortableItem = ({ id, type, item, featureName, onEdit, onDelete, onUpdate, isMoving, isDraggingActive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id });

  const shouldHide = isMoving;

  const style = {
    transform: CSS.Transform.toString(transform),
    // Only animate during active drag, not on release
    transition: isDraggingActive && !isDragging ? 'transform 200ms ease' : undefined,
    opacity: shouldHide ? 0 : (isDragging ? 0.8 : 1),
    visibility: shouldHide ? 'hidden' : 'visible',
    zIndex: isDragging ? 1000 : undefined,
    cursor: isDragging ? 'grabbing' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {type === 'task' ? (
        <TaskCard
          task={item}
          featureName={featureName}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ) : (
        <BugCard
          bug={item}
          featureName={featureName}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

// Kanban Column Component
const KanbanColumn = ({
  status,
  title,
  items,
  count,
  color,
  onAddTask,
  onAddBug,
  getFeatureName,
  onEdit,
  onDelete,
  onUpdateTask,
  onUpdateBug,
  movingItemId,
  isDraggingActive,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  return (
    <Box
      sx={{
        minWidth: 300,
        maxWidth: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 320px)',
      }}
    >
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: isOver ? 'action.hover' : 'background.paper',
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
          ref={setNodeRef}
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
          <SortableContext items={items.map((item) => item.uniqueId)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableItem
                key={item.uniqueId}
                id={item.uniqueId}
                type={item.type}
                item={item.data}
                featureName={getFeatureName(item.data.featureId)}
                onEdit={(data) => onEdit(data, item.type)}
                onDelete={(data) => onDelete(data, item.type)}
                onUpdate={item.type === 'task' ? onUpdateTask : onUpdateBug}
                isMoving={movingItemId === item.data.id}
                isDraggingActive={isDraggingActive}
              />
            ))}
          </SortableContext>
        </Box>

        {status === STATUS.CREATED && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              size="small"
              startIcon={<TaskIcon />}
              onClick={onAddTask}
              fullWidth
              variant="outlined"
            >
              Task
            </Button>
            <Button
              size="small"
              startIcon={<BugReportIcon />}
              onClick={onAddBug}
              fullWidth
              variant="outlined"
              color="error"
            >
              Bug
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

const IdeaDetailPage = () => {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ideas, loading: ideasLoading, error: ideasError, updateIdea } = useIdeas();
  const { features } = useFeatures(ideaId);
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { bugs, createBug, updateBug, deleteBug } = useBugs();

  const [idea, setIdea] = useState(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteType, setDeleteType] = useState('task');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);
  const [movingItemId, setMovingItemId] = useState(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Filter tasks and bugs for this idea
  const ideaTasks = tasks.filter((task) => task.ideaId === ideaId);
  const ideaBugs = bugs.filter((bug) => bug.ideaId === ideaId);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (ideas.length > 0) {
      const foundIdea = ideas.find((i) => i.id === ideaId);
      if (foundIdea) {
        setIdea(foundIdea);
      } else {
        navigate('/ideas');
      }
    }
  }, [ideas, ideaId, navigate]);

  const handleOpenTaskDialog = (task = null) => {
    setSelectedItem(task);
    setTaskDialogOpen(true);
  };

  const handleOpenBugDialog = (bug = null) => {
    setSelectedItem(bug);
    setBugDialogOpen(true);
  };

  const handleCloseTaskDialog = () => {
    setTaskDialogOpen(false);
    setSelectedItem(null);
  };

  const handleCloseBugDialog = () => {
    setBugDialogOpen(false);
    setSelectedItem(null);
  };

  const handleOpenDeleteDialog = (item, type) => {
    setSelectedItem(item);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const handleSubmitTask = async (formData) => {
    setActionLoading(true);
    try {
      const taskData = {
        ...formData,
        ideaId,
      };

      if (selectedItem) {
        await updateTask(selectedItem.id, taskData);
        setSnackbar({ open: true, message: 'Task updated successfully!', severity: 'success' });
      } else {
        await createTask({ ...taskData, creatorName: user?.displayName || user?.email || '' });
        setSnackbar({ open: true, message: 'Task created successfully!', severity: 'success' });
      }
      handleCloseTaskDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitBug = async (formData) => {
    setActionLoading(true);
    try {
      const bugData = {
        ...formData,
        ideaId,
      };

      if (selectedItem) {
        await updateBug(selectedItem.id, bugData);
        setSnackbar({ open: true, message: 'Bug updated successfully!', severity: 'success' });
      } else {
        await createBug({ ...bugData, creatorName: user?.displayName || user?.email || '' });
        setSnackbar({ open: true, message: 'Bug reported successfully!', severity: 'success' });
      }
      handleCloseBugDialog();
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
      if (deleteType === 'task') {
        await deleteTask(selectedItem.id);
        setSnackbar({ open: true, message: 'Task deleted successfully!', severity: 'success' });
      } else {
        await deleteBug(selectedItem.id);
        setSnackbar({ open: true, message: 'Bug deleted successfully!', severity: 'success' });
      }
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
        await updateIdea(ideaId, { title: editedTitle.trim() });
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
        await updateIdea(ideaId, { description: editedDescription });
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

  const handleDragStart = () => {
    setIsDraggingActive(true);
  };

  const handleDragEnd = async (event) => {
    setIsDraggingActive(false);
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeIdStr = active.id;
    const overId = over.id;

    // Parse the active ID to get type, item ID, and status
    const [activeType, activeItemId, activeStatus] = activeIdStr.split('-');

    // Determine target status - handle both column drops and item drops
    let overStatus;
    let overItemId = null;
    if (overId.startsWith('column-')) {
      // Dropped on a column
      overStatus = overId.replace('column-', '');
    } else {
      // Dropped on an item - get status and item ID from the item's ID
      const [, itemId, status] = overId.split('-');
      overStatus = status;
      overItemId = itemId;
    }

    if (!overStatus) {
      setActiveId(null);
      return;
    }

    // Same lane sorting
    if (activeStatus === overStatus && overItemId && activeItemId !== overItemId) {
      setActiveId(null);

      // Get all items in this column
      const columnItems = getColumnItems(activeStatus);
      const oldIndex = columnItems.findIndex((item) => item.data.id === activeItemId);
      const newIndex = columnItems.findIndex((item) => item.data.id === overItemId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Reorder and update all affected items
        const reorderedItems = arrayMove(columnItems, oldIndex, newIndex);

        try {
          // Update order for all items in the new order
          const updatePromises = reorderedItems.map((item, index) => {
            if (item.type === 'task') {
              return updateTask(item.data.id, { order: index });
            } else {
              return updateBug(item.data.id, { order: index });
            }
          });
          await Promise.all(updatePromises);
        } catch (err) {
          setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
        }
      }
      return;
    }

    // Cross-lane move
    if (activeStatus !== overStatus) {
      // Keep item hidden during the move
      setMovingItemId(activeItemId);
      setActiveId(null);

      const targetColumnItems = getColumnItems(overStatus);

      // Calculate the new order based on drop position
      let newOrder;
      if (overItemId) {
        // Dropped on a specific item - insert at that position
        const dropIndex = targetColumnItems.findIndex((item) => item.data.id === overItemId);
        if (dropIndex !== -1) {
          newOrder = dropIndex;
        } else {
          newOrder = targetColumnItems.length;
        }
      } else {
        // Dropped on empty column - place at the end
        newOrder = targetColumnItems.length;
      }

      // Update the item's status and reorder all items in the target column
      try {
        // First, update orders for existing items that need to shift down
        const updatePromises = targetColumnItems
          .filter((_, index) => index >= newOrder)
          .map((item) => {
            const currentIndex = targetColumnItems.findIndex((i) => i.data.id === item.data.id);
            if (item.type === 'task') {
              return updateTask(item.data.id, { order: currentIndex + 1 });
            } else {
              return updateBug(item.data.id, { order: currentIndex + 1 });
            }
          });
        await Promise.all(updatePromises);

        // Then update the moved item with new status and order
        if (activeType === 'task') {
          const task = ideaTasks.find((t) => t.id === activeItemId);
          if (task) {
            await updateTask(activeItemId, { status: overStatus, order: newOrder });
            setSnackbar({ open: true, message: 'Task moved successfully!', severity: 'success' });
          }
        } else if (activeType === 'bug') {
          const bug = ideaBugs.find((b) => b.id === activeItemId);
          if (bug) {
            await updateBug(activeItemId, { status: overStatus, order: newOrder });
            setSnackbar({ open: true, message: 'Bug moved successfully!', severity: 'success' });
          }
        }
      } catch (err) {
        setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
      } finally {
        setMovingItemId(null);
      }
      return;
    }
  };

  const handleDragOver = () => {
    // Allow cross-column drops
  };

  const columns = [
    { status: STATUS.CREATED, title: 'Created', color: 'default' },
    { status: STATUS.TODO, title: 'To Do', color: 'warning' },
    { status: STATUS.IN_PROGRESS, title: 'In Progress', color: 'info' },
    { status: STATUS.DONE, title: 'Done', color: 'success' },
  ];

  const getColumnItems = (status) => {
    const columnTasks = ideaTasks
      .filter((task) => task.status === status)
      .map((task) => ({
        uniqueId: `task-${task.id}-${status}`,
        type: 'task',
        data: task,
      }));

    const columnBugs = ideaBugs
      .filter((bug) => bug.status === status)
      .map((bug) => ({
        uniqueId: `bug-${bug.id}-${status}`,
        type: 'bug',
        data: bug,
      }));

    return [...columnTasks, ...columnBugs];
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container maxWidth="xl" sx={{ pt: 3, pb: 2 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <Link
            color="inherit"
            onClick={() => navigate('/ideas')}
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            Ideas
          </Link>
          <Typography color="text.primary">{idea.title}</Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              {editingTitle ? (
                <TextField
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  fullWidth
                  variant="standard"
                  sx={{
                    '& .MuiInput-input': {
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', borderRadius: 1 },
                    p: 0.5,
                    m: -0.5,
                  }}
                  onClick={handleTitleClick}
                >
                  {idea.title}
                </Typography>
              )}
              {editingDescription ? (
                <TextField
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  onKeyDown={handleDescriptionKeyDown}
                  autoFocus
                  fullWidth
                  multiline
                  variant="standard"
                  placeholder="Add a description..."
                  sx={{
                    '& .MuiInput-input': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', borderRadius: 1 },
                    p: 0.5,
                    m: -0.5,
                    minHeight: 24,
                  }}
                  onClick={handleDescriptionClick}
                >
                  {idea.description || 'Click to add description...'}
                </Typography>
              )}
            </Box>
            <StatusBadge status={idea.status} size="medium" />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`${ideaTasks.length} Task${ideaTasks.length !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
              color="primary"
            />
            <Chip
              label={`${ideaBugs.length} Bug${ideaBugs.length !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
              color="error"
            />
            <Chip
              label={`${features.length} Feature${features.length !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
              color="default"
            />
          </Box>
        </Paper>
      </Container>

      <Container maxWidth="xl" sx={{ flexGrow: 1, overflow: 'hidden', pb: 3 }}>
        {ideaTasks.length === 0 && ideaBugs.length === 0 ? (
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
              No tasks or bugs yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get started by creating your first task or reporting a bug
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<TaskIcon />}
                onClick={() => handleOpenTaskDialog()}
              >
                Create Task
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<BugReportIcon />}
                onClick={() => handleOpenBugDialog()}
              >
                Report Bug
              </Button>
            </Box>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
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
              {columns.map((column) => {
                const items = getColumnItems(column.status);
                return (
                  <KanbanColumn
                    key={column.status}
                    status={column.status}
                    title={column.title}
                    items={items}
                    count={items.length}
                    color={column.color}
                    onAddTask={() => handleOpenTaskDialog()}
                    onAddBug={() => handleOpenBugDialog()}
                    getFeatureName={getFeatureName}
                    onEdit={(item, type) =>
                      type === 'task' ? handleOpenTaskDialog(item) : handleOpenBugDialog(item)
                    }
                    onDelete={handleOpenDeleteDialog}
                    onUpdateTask={updateTask}
                    onUpdateBug={updateBug}
                    movingItemId={movingItemId}
                    isDraggingActive={isDraggingActive}
                  />
                );
              })}
            </Box>

          </DndContext>
        )}
      </Container>

      <TaskFormDialog
        open={taskDialogOpen}
        onClose={handleCloseTaskDialog}
        onSubmit={handleSubmitTask}
        task={selectedItem}
        features={features}
        ideaId={ideaId}
        loading={actionLoading}
      />

      <BugFormDialog
        open={bugDialogOpen}
        onClose={handleCloseBugDialog}
        onSubmit={handleSubmitBug}
        bug={selectedItem}
        features={features}
        ideaId={ideaId}
        loading={actionLoading}
      />

      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteType}? This action cannot be undone.
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
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default IdeaDetailPage;

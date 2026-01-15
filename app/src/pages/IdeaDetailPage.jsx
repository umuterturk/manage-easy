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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskIcon from '@mui/icons-material/Task';
import BugReportIcon from '@mui/icons-material/BugReport';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIdeas } from '../hooks/useIdeas';
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
const SortableItem = ({ id, type, item, featureName, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {type === 'task' ? (
        <TaskCard
          task={item}
          featureName={featureName}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <BugCard
          bug={item}
          featureName={featureName}
          onEdit={onEdit}
          onDelete={onDelete}
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
}) => {
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
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            {title}
          </Typography>
          <Chip label={count} size="small" color={color} />
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 1,
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
  const { ideas, loading: ideasLoading, error: ideasError } = useIdeas();
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
  const [activeId, setActiveId] = useState(null);

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
        await createTask(taskData);
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
        await createBug(bugData);
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

  const getFeatureName = (featureId) => {
    const feature = features.find((f) => f.id === featureId);
    return feature?.title || null;
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Parse the IDs to get type, item ID, and status
    const [activeType, activeItemId, activeStatus] = activeId.split('-');
    const overStatus = overId.split('-')[2] || overId; // Handle both item and column drops

    if (activeStatus === overStatus) return;

    // Update the item's status
    try {
      if (activeType === 'task') {
        const task = ideaTasks.find((t) => t.id === activeItemId);
        if (task) {
          await updateTask(activeItemId, { status: overStatus });
          setSnackbar({ open: true, message: 'Task moved successfully!', severity: 'success' });
        }
      } else if (activeType === 'bug') {
        const bug = ideaBugs.find((b) => b.id === activeItemId);
        if (bug) {
          await updateBug(activeItemId, { status: overStatus });
          setSnackbar({ open: true, message: 'Bug moved successfully!', severity: 'success' });
        }
      }
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    }
  };

  const handleDragOver = (event) => {
    const { over } = event;
    // This allows dropping on columns even if they're empty
    if (over) {
      event.active.data.current = { ...event.active.data.current, overId: over.id };
    }
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

  const activeItem = activeId
    ? [...ideaTasks, ...ideaBugs].find(
        (item) => `task-${item.id}` === activeId || `bug-${item.id}` === activeId
      )
    : null;

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
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                {idea.title}
              </Typography>
              {idea.description && (
                <Typography variant="body2" color="text.secondary">
                  {idea.description}
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
                  />
                );
              })}
            </Box>

            <DragOverlay>
              {activeId && activeItem ? (
                <Box sx={{ opacity: 0.8, cursor: 'grabbing' }}>
                  {activeId.startsWith('task-') ? (
                    <TaskCard
                      task={activeItem}
                      featureName={getFeatureName(activeItem.featureId)}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ) : (
                    <BugCard
                      bug={activeItem}
                      featureName={getFeatureName(activeItem.featureId)}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  )}
                </Box>
              ) : null}
            </DragOverlay>
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

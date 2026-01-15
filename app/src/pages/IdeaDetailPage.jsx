import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
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
  TextField,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
} from '@mui/material';
import TaskIcon from '@mui/icons-material/Task';
import BugReportIcon from '@mui/icons-material/BugReport';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useIdeas } from '../hooks/useIdeas';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { useFeatures } from '../hooks/useFeatures';
import { useTasks } from '../hooks/useTasks';
import { useBugs } from '../hooks/useBugs';
import StatusBadge from '../components/StatusBadge';
import TaskCard from '../components/TaskCard';
import BugCard from '../components/BugCard';
import TaskFormDialog from '../components/TaskFormDialog';
import BugFormDialog from '../components/BugFormDialog';
import { STATUS } from '../utils/constants';

const CARD_HEIGHT = 120; // Fixed card height in pixels
const CARD_GAP = 8; // Gap between cards

// Draggable card wrapper
const DraggableCard = ({
  type,
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
    // Don't start drag on buttons, inputs, textareas or elements intended to be clickable
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      window.getComputedStyle(e.target).cursor === 'pointer'
    ) return;

    e.preventDefault();
    onDragStart(e, item, type);
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
      {type === 'task' ? (
        <TaskCard
          task={item}
          featureName={featureName}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          autoFocus={autoFocus}
          isDraft={isDraft}
          onSaveDraft={onSaveDraft}
          onCancelDraft={onCancelDraft}
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
  onAddTask,
  onAddBug,
  getFeatureName,
  onEdit,
  onDelete,
  onUpdateTask,
  onUpdateBug,
  onDragStart,
  dragState,
  columnRef,
  onLaneDoubleClick,
  autoFocusTaskId,
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
              type={item.type}
              item={item.data}
              featureName={item.isPlaceholder ? null : getFeatureName(item.data?.featureId)}
              onEdit={(data) => onEdit(data, item.type)}
              onDelete={(data) => onDelete(data, item.type)}
              onUpdate={item.type === 'task' ? onUpdateTask : onUpdateBug}
              onDragStart={onDragStart}
              isDragging={dragState?.activeItemId === item.data?.id}
              isPlaceholder={item.isPlaceholder}
              autoFocus={autoFocusTaskId === item.data?.id}
              isDraft={item.isDraft}
              onSaveDraft={(title) => onSaveDraft(title, status)}
              onCancelDraft={onCancelDraft}
            />
          ))}
        </Box>

        {/* Buttons removed in favor of floating action button */}
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
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { bugs, createBug, updateBug, deleteBug } = useBugs();
  const [autoFocusTaskId, setAutoFocusTaskId] = useState(null);
  const [draftTask, setDraftTask] = useState(null);

  const [idea, setIdea] = useState(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteType, setDeleteType] = useState('task');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Drag state: { activeItemId, activeType, sourceStatus, targetStatus, targetIndex }
  const [dragState, setDragState] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [optimisticOrder, setOptimisticOrder] = useState(null);

  // Refs for columns
  const columnRefs = useRef({});

  // Filter tasks and bugs for this idea
  const baseIdeaTasks = tasks.filter((task) => task.ideaId === ideaId);
  const baseIdeaBugs = bugs.filter((bug) => bug.ideaId === ideaId);

  // Apply optimistic ordering if present
  const ideaTasks = optimisticOrder
    ? baseIdeaTasks.map((task) => {
      const optimisticIndex = optimisticOrder.items.findIndex((item) => item.id === task.id && item.type === 'task');
      if (optimisticIndex !== -1) {
        return { ...task, order: optimisticIndex, status: optimisticOrder.status };
      }
      return task;
    })
    : baseIdeaTasks;

  const ideaBugs = optimisticOrder
    ? baseIdeaBugs.map((bug) => {
      const optimisticIndex = optimisticOrder.items.findIndex((item) => item.id === bug.id && item.type === 'bug');
      if (optimisticIndex !== -1) {
        return { ...bug, order: optimisticIndex, status: optimisticOrder.status };
      }
      return bug;
    })
    : baseIdeaBugs;

  useEffect(() => {
    if (ideas.length > 0) {
      const foundIdea = ideas.find((i) => i.id === ideaId);
      if (foundIdea) {
        setIdea(foundIdea);
        // Save as last visited idea
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

      const { activeItemId, activeType, sourceStatus, targetStatus, targetIndex } = dragState;

      // Build the new order with the dragged item inserted
      const draggedItemData = activeType === 'task'
        ? ideaTasks.find((t) => t.id === activeItemId)
        : ideaBugs.find((b) => b.id === activeItemId);

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
        uniqueId: `${activeType}-${activeItemId}-${targetStatus}`,
        type: activeType,
        data: draggedItemData,
      };
      newItems.splice(Math.min(targetIndex, newItems.length), 0, draggedItem);

      // Apply optimistic update
      setOptimisticOrder({
        status: targetStatus,
        items: newItems.map((item) => ({ id: item.data.id, type: item.type })),
      });

      setDragState(null);

      try {
        if (sourceStatus === targetStatus) {
          // Same lane sorting
          const updatePromises = newItems.map((item, index) => {
            if (item.type === 'task') {
              return updateTask(item.data.id, { order: index });
            } else {
              return updateBug(item.data.id, { order: index });
            }
          });
          await Promise.all(updatePromises);
        } else {
          // Cross-lane move
          const updatePromises = newItems.map((item, index) => {
            if (item.data.id === activeItemId) {
              if (item.type === 'task') {
                return updateTask(item.data.id, { status: targetStatus, order: index });
              } else {
                return updateBug(item.data.id, { status: targetStatus, order: index });
              }
            } else {
              if (item.type === 'task') {
                return updateTask(item.data.id, { order: index });
              } else {
                return updateBug(item.data.id, { order: index });
              }
            }
          });
          await Promise.all(updatePromises);
          setSnackbar({ open: true, message: `${activeType === 'task' ? 'Task' : 'Bug'} moved successfully!`, severity: 'success' });
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
  }, [dragState, ideaTasks, ideaBugs, updateTask, updateBug]);

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

  const handleLaneDoubleClick = (status) => {
    // Check if there is already a draft in any lane
    if (draftTask) return;

    // Check if there is already an "empty" task in this lane (existing saved one)
    const existingItems = getBaseColumnItems(status);
    const emptyTask = existingItems.find(item =>
      item.type === 'task' &&
      (!item.data.title || item.data.title.trim() === '')
    );

    if (emptyTask) {
      setAutoFocusTaskId(emptyTask.data.id);
      setTimeout(() => setAutoFocusTaskId(null), 1000);
      return;
    }

    // Create local draft instead of API call
    setDraftTask({ status });
  };

  const handleSaveDraft = async (title, status) => {
    try {
      const taskData = {
        title,
        description: '',
        status,
        ideaId,
        creatorName: user?.displayName || user?.email || '',
      };

      await createTask(taskData);
      setDraftTask(null);
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: 'error' });
    }
  };

  const handleCancelDraft = () => {
    setDraftTask(null);
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

  const handleDragStart = (e, item, type) => {
    const status = item.status;
    setDragState({
      activeItemId: item.id,
      activeType: type,
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

    const items = [...columnTasks, ...columnBugs].sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

    // Inject draft task at the end if status matches
    if (draftTask && draftTask.status === status) {
      items.push({
        uniqueId: 'draft-task',
        type: 'task',
        data: { id: 'draft-id', title: '', status: status },
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
        type: dragState.activeType,
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

  // Get the dragged item data for the floating card
  const getDraggedItemData = () => {
    if (!dragState) return null;
    const { activeItemId, activeType } = dragState;
    if (activeType === 'task') {
      return { type: 'task', data: ideaTasks.find((t) => t.id === activeItemId) };
    } else {
      return { type: 'bug', data: ideaBugs.find((b) => b.id === activeItemId) };
    }
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

  const draggedItem = getDraggedItemData();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


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
            {columns.map((column) => {
              const items = getColumnItemsWithPlaceholder(column.status);
              return (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  title={column.title}
                  items={items}
                  count={getBaseColumnItems(column.status).filter(
                    (item) => !dragState || item.data.id !== dragState.activeItemId || dragState.targetStatus === column.status
                  ).length}
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
                  onDragStart={handleDragStart}
                  dragState={dragState}
                  columnRef={(el) => (columnRefs.current[column.status] = el)}
                  onLaneDoubleClick={handleLaneDoubleClick}
                  autoFocusTaskId={autoFocusTaskId}
                  onSaveDraft={handleSaveDraft}
                  onCancelDraft={handleCancelDraft}
                />
              );
            })}
          </Box>
        )}
      </Container>

      {/* Floating dragged card */}
      {dragState && draggedItem?.data && (
        <Box
          sx={{
            position: 'fixed',
            left: dragPosition.x - 140,
            top: dragPosition.y - 60,
            width: 280,
            height: CARD_HEIGHT,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.9,
            transform: 'rotate(3deg)',
            '& > *': {
              height: '100%',
            },
          }}
        >
          {draggedItem.type === 'task' ? (
            <TaskCard
              task={draggedItem.data}
              featureName={getFeatureName(draggedItem.data.featureId)}
              onEdit={() => { }}
              onDelete={() => { }}
            />
          ) : (
            <BugCard
              bug={draggedItem.data}
              featureName={getFeatureName(draggedItem.data.featureId)}
              onEdit={() => { }}
              onDelete={() => { }}
            />
          )}
        </Box>
      )}

      <SpeedDial
        ariaLabel="Create new item"
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          key="task"
          icon={<TaskIcon />}
          tooltipTitle="Create Task"
          onClick={() => handleOpenTaskDialog()}
        />
        <SpeedDialAction
          key="bug"
          icon={<BugReportIcon />}
          tooltipTitle="Report Bug"
          onClick={() => handleOpenBugDialog()}
        />
      </SpeedDial>

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

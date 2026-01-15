import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  TextField,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import BugReportIcon from '@mui/icons-material/BugReport';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import EnlargedCardModal from './EnlargedCardModal';

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  const date = timestamp._seconds
    ? new Date(timestamp._seconds * 1000)
    : new Date(timestamp);

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 4) return `${diffWeeks}w`;
  return `${diffMonths}mo`;
};

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const BugCard = ({ bug, featureName, onEdit, onDelete, onUpdate }) => {
  const [enlarged, setEnlarged] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleTitleClick = (e) => {
    e.stopPropagation();
    setEditedTitle(bug.title);
    setEditingTitle(true);
  };

  const handleDescriptionClick = (e) => {
    e.stopPropagation();
    setEditedDescription(bug.description || '');
    setEditingDescription(true);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== bug.title && onUpdate) {
      await onUpdate(bug.id, { title: editedTitle.trim() });
    }
    setEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (editedDescription !== bug.description && onUpdate) {
      await onUpdate(bug.id, { description: editedDescription });
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

  const handleArchiveToggle = async () => {
    setArchiveConfirmOpen(false);
    if (onUpdate) {
      await onUpdate(bug.id, { archived: !bug.archived });
    }
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          cursor: editingTitle || editingDescription ? 'default' : 'grab',
          '&:hover': {
            boxShadow: 2,
          },
          border: '1px solid',
          borderColor: 'error.light',
          borderLeftWidth: 4,
          bgcolor: 'background.paper',
          backgroundImage: (theme) => `linear-gradient(${alpha(theme.palette.error.main, 0.04)}, ${alpha(theme.palette.error.main, 0.04)})`,
        }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pr: 1 }}>
              <BugReportIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5, flexShrink: 0 }} />
              {editingTitle ? (
                <TextField
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  fullWidth
                  size="small"
                  variant="standard"
                  sx={{
                    '& .MuiInput-input': {
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5 },
                    p: 0.25,
                    m: -0.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                  onClick={handleTitleClick}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {bug.title}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEnlarged(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ mt: -0.5, mr: -0.5 }}
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Box>

          {editingDescription ? (
            <TextField
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={handleDescriptionKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              fullWidth
              multiline
              size="small"
              variant="standard"
              placeholder="Add a description..."
              sx={{
                mb: 1,
                '& .MuiInput-input': {
                  fontSize: '0.75rem',
                },
              }}
            />
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover', borderRadius: 0.5 },
                p: 0.25,
                m: -0.25,
                minHeight: 18,
              }}
              onClick={handleDescriptionClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {bug.description || 'Click to add description...'}
            </Typography>
          )}

          {bug.tags && bug.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, flexShrink: 0 }}>
              {bug.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: alpha('#f44336', 0.08),
                    color: 'error.dark',
                    borderColor: alpha('#f44336', 0.2),
                    border: '1px solid',
                  }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {(featureName || bug.creatorName || bug.createdAt) && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 'auto', pt: 0.5, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                {bug.creatorName && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {getInitials(bug.creatorName)}
                  </Typography>
                )}
                {bug.createdAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
                    · {formatTimeAgo(bug.createdAt)}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 0.5 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {bug.comments?.length || 0}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {featureName && (
                  <Chip
                    label={featureName}
                    size="small"
                    sx={{
                      height: 14,
                      fontSize: '0.55rem',
                      backgroundColor: 'error.main',
                      color: 'error.contrastText',
                      maxWidth: 60,
                    }}
                  />
                )}
                <Tooltip title="Archive" placement="top">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchiveConfirmOpen(true);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{ p: 0.2, color: 'text.disabled', '&:hover': { color: 'warning.main' } }}
                  >
                    <ArchiveIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete" placement="top">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bug, 'bug');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{ p: 0.2, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onClose={() => setArchiveConfirmOpen(false)}>
        <DialogContent>
          <Typography>
            Are you sure you want to archive this bug?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleArchiveToggle} variant="contained" color="warning">
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      <EnlargedCardModal
        open={enlarged}
        onClose={() => setEnlarged(false)}
        data={bug}
        featureName={featureName}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isBug={true}
      />
    </>
  );
};

export default BugCard;

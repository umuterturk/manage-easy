import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    IconButton,
    Chip,
    Grow,
    Tooltip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Autocomplete,
    Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { STATUS, STATUS_LABELS } from '../utils/constants';

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

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return `${diffMonths}mo ago`;
};

const EnlargedCardModal = ({ open, onClose, data, features = [], allUsers = [], featureName, onUpdate, onDelete }) => {
    // Derive isBug from data.type
    // Check for both 'BUG' (backend enum) and 'bug' (legacy/lowercase)
    const isBug = data?.type === 'BUG' || data?.type === 'bug';
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [commentText, setCommentText] = useState('');
    const [addingComment, setAddingComment] = useState(false);
    const [tagText, setTagText] = useState('');
    const [isAddingTag, setIsAddingTag] = useState(false);
    const { user } = useAuth();

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

    // Sync state with data when modal opens or data changes
    useEffect(() => {
        if (data) {
            setEditedTitle(data.title || '');
            setEditedDescription(data.description || '');
        }
    }, [data, open]);

    const handleTitleSave = async () => {
        if (editedTitle.trim() && editedTitle !== data.title && onUpdate) {
            await onUpdate(data.id, { title: editedTitle.trim() });
        }
        setEditingTitle(false);
    };

    const handleDescriptionSave = async () => {
        if (editedDescription !== data.description && onUpdate) {
            await onUpdate(data.id, { description: editedDescription });
        }
        setEditingDescription(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            setEditingTitle(false);
            setEditedTitle(data.title);
        }
    };

    const handleDescriptionKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleDescriptionSave();
        } else if (e.key === 'Escape') {
            setEditingDescription(false);
            setEditedDescription(data.description || '');
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || addingComment) return;

        setAddingComment(true);
        try {
            const type = 'works';

            const response = await ApiService.addComment(
                type,
                data.id,
                commentText.trim(),
                user?.displayName || user?.email || 'Anonymous'
            );

            if (response.success) {
                setCommentText('');
                // We need to update the local data to show the new comment immediately
                if (onUpdate) {
                    const updatedComments = [...(data.comments || []), response.comment];
                    onUpdate(data.id, { comments: updatedComments });
                }
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        } finally {
            setAddingComment(false);
        }
    };

    const handleAddTag = async () => {
        if (!tagText.trim()) {
            setIsAddingTag(false);
            return;
        }

        const newTag = tagText.trim();
        const currentTags = data.tags || [];

        if (currentTags.includes(newTag)) {
            setTagText('');
            setIsAddingTag(false);
            return;
        }

        const updatedTags = [...currentTags, newTag];
        if (onUpdate) {
            await onUpdate(data.id, { tags: updatedTags });
        }
        setTagText('');
        setIsAddingTag(false);
    };

    const handleRemoveTag = async (tagToRemove) => {
        const updatedTags = (data.tags || []).filter(t => t !== tagToRemove);
        if (onUpdate) {
            await onUpdate(data.id, { tags: updatedTags });
        }
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleAddTag();
        } else if (e.key === 'Escape') {
            setTagText('');
            setIsAddingTag(false);
        }
    };

    const handleUpdateComment = async (commentId) => {
        if (!editingCommentText.trim()) return;

        try {
            const type = 'works';
            const response = await ApiService.updateComment(
                type,
                data.id,
                commentId,
                editingCommentText.trim()
            );

            if (response.success) {
                if (onUpdate) {
                    const updatedComments = data.comments.map(c =>
                        c.id === commentId ? { ...c, text: editingCommentText.trim() } : c
                    );
                    onUpdate(data.id, { comments: updatedComments });
                }
                setEditingCommentId(null);
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            alert('Failed to update comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        try {
            const type = 'works';
            const response = await ApiService.deleteComment(type, data.id, commentId);

            if (response.success) {
                if (onUpdate) {
                    const updatedComments = data.comments.filter(c => c.id !== commentId);
                    onUpdate(data.id, { comments: updatedComments });
                }
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment');
        }
    };

    const handleArchiveToggle = async () => {
        setArchiveConfirmOpen(false);
        if (onUpdate) {
            await onUpdate(data.id, { archived: !data.archived });
            onClose();
        }
    };

    const handleTypeChange = async (newType) => {
        // Just update the type field
        try {
            const typeValue = newType === 'task' ? 'TASK' : 'BUG';
            if (onUpdate) {
                await onUpdate(data.id, { type: typeValue });
            }
        } catch (error) {
            console.error('Error updating type:', error);
            alert('Failed to update type');
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (newStatus === data.status) return;

        if (onUpdate) {
            await onUpdate(data.id, { status: newStatus });
        }
    };

    const handleFeatureIdChange = async (newFeatureId) => {
        if (newFeatureId === (data.featureId || '')) return;

        if (onUpdate) {
            await onUpdate(data.id, { featureId: newFeatureId === 'none' ? '' : newFeatureId });
        }
    };

    if (!data) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: '40vh',
                    borderLeft: '6px solid',
                    borderLeftColor: isBug ? 'error.light' : 'primary.light',
                    bgcolor: 'background.paper',
                    backgroundImage: (theme) => isBug
                        ? `linear-gradient(${alpha(theme.palette.error.main, 0.03)}, ${alpha(theme.palette.error.main, 0.03)})`
                        : `linear-gradient(${alpha(theme.palette.primary.main, 0.03)}, ${alpha(theme.palette.primary.main, 0.03)})`,
                }
            }}
            TransitionComponent={Grow}
            transitionDuration={300}
        >

            <DialogContent
                sx={{ pt: 3, pb: 3 }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Title Section */}
                <Box sx={{ mb: 3 }}>
                    {editingTitle ? (
                        <TextField
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiInput-input': {
                                    fontWeight: 600,
                                    fontSize: '1.25rem',
                                },
                            }}
                        />
                    ) : (
                        <Typography
                            variant="h6"
                            onClick={() => setEditingTitle(true)}
                            sx={{
                                fontWeight: 600,
                                cursor: 'pointer',
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main',
                                },
                            }}
                        >
                            {data.title}
                        </Typography>
                    )}
                </Box>

                {/* Description Section */}
                <Box sx={{ mb: 3 }}>
                    {editingDescription ? (
                        <TextField
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            onBlur={handleDescriptionSave}
                            onKeyDown={handleDescriptionKeyDown}
                            autoFocus
                            fullWidth
                            multiline
                            minRows={4}
                            variant="outlined"
                            placeholder="Add a description..."
                        />
                    ) : (
                        <Typography
                            variant="body1"
                            onClick={() => setEditingDescription(true)}
                            sx={{
                                cursor: 'pointer',
                                whiteSpace: 'pre-wrap',
                                minHeight: '100px',
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main',
                                },
                                color: data.description ? 'text.primary' : 'text.disabled',
                            }}
                        >
                            {data.description || 'No description provided. Click to add one.'}
                        </Typography>
                    )}
                </Box>

                {/* Tags Section */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocalOfferIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            Tags
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        {data.tags?.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                onDelete={() => handleRemoveTag(tag)}
                                sx={{
                                    bgcolor: alpha(isBug ? '#f44336' : '#2196f3', 0.1),
                                    color: isBug ? 'error.dark' : 'primary.dark',
                                    border: '1px solid',
                                    borderColor: alpha(isBug ? '#f44336' : '#2196f3', 0.2),
                                    '& .MuiChip-deleteIcon': {
                                        color: isBug ? 'error.main' : 'primary.main',
                                        '&:hover': { color: isBug ? 'error.dark' : 'primary.dark' },
                                    }
                                }}
                            />
                        ))}
                        {isAddingTag ? (
                            <TextField
                                value={tagText}
                                onChange={(e) => setTagText(e.target.value)}
                                onBlur={handleAddTag}
                                onKeyDown={handleTagKeyDown}
                                autoFocus
                                size="small"
                                variant="standard"
                                placeholder="Tag name..."
                                sx={{
                                    width: 120,
                                    '& .MuiInput-input': { fontSize: '0.8125rem', py: 0.5 }
                                }}
                            />
                        ) : (
                            <Chip
                                icon={<AddIcon sx={{ fontSize: '1rem !important' }} />}
                                label="Add Tag"
                                size="small"
                                onClick={() => setIsAddingTag(true)}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: 'action.hover',
                                    border: '1px dashed',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: 'action.selected' }
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Comments Section - Only for Tasks and Bugs (EnlargedCardModal is exclusively used for them) */}
                <Box sx={{ mt: 4, mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Comments ({data.comments?.length || 0})
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        {data.comments?.map((comment) => (
                            <Box key={comment.id} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, position: 'relative' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                        {comment.authorName}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {formatTimeAgo(comment.createdAt)}
                                        </Typography>
                                        {comment.authorId === user?.uid && (
                                            <IconButton
                                                size="small"
                                                sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                                onClick={() => handleDeleteComment(comment.id)}
                                            >
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Box>

                                {editingCommentId === comment.id ? (
                                    <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        onBlur={() => handleUpdateComment(comment.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleUpdateComment(comment.id);
                                            } else if (e.key === 'Escape') {
                                                setEditingCommentId(null);
                                            }
                                        }}
                                        autoFocus
                                    />
                                ) : (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontSize: '0.85rem',
                                            cursor: comment.authorId === user?.uid ? 'pointer' : 'default',
                                            '&:hover': comment.authorId === user?.uid ? { color: 'primary.main' } : {}
                                        }}
                                        onClick={() => {
                                            if (comment.authorId === user?.uid) {
                                                setEditingCommentId(comment.id);
                                                setEditingCommentText(comment.text);
                                            }
                                        }}
                                    >
                                        {comment.text}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                        {(!data.comments || data.comments.length === 0) && (
                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                                No comments yet.
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Add a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            disabled={!commentText.trim() || addingComment}
                            onClick={handleAddComment}
                        >
                            Add
                        </Button>
                    </Box>
                </Box>

                {/* Type, Status, and Feature Selectors */}
                <Box sx={{ display: 'flex', gap: 2, mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel id="type-select-label">Type</InputLabel>
                        <Select
                            labelId="type-select-label"
                            id="type-select"
                            value={isBug ? 'bug' : 'task'}
                            label="Type"
                            onChange={(e) => handleTypeChange(e.target.value)}
                        >
                            <MenuItem value="task">Task</MenuItem>
                            <MenuItem value="bug">Bug</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel id="status-select-label">Status</InputLabel>
                        <Select
                            labelId="status-select-label"
                            id="status-select"
                            value={data.status}
                            label="Status"
                            onChange={(e) => handleStatusChange(e.target.value)}
                        >
                            <MenuItem value={STATUS.CREATED}>{STATUS_LABELS[STATUS.CREATED]}</MenuItem>
                            <MenuItem value={STATUS.TODO}>{STATUS_LABELS[STATUS.TODO]}</MenuItem>
                            <MenuItem value={STATUS.IN_PROGRESS}>{STATUS_LABELS[STATUS.IN_PROGRESS]}</MenuItem>
                            <MenuItem value={STATUS.DONE}>{STATUS_LABELS[STATUS.DONE]}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="feature-select-label">Feature</InputLabel>
                        <Select
                            labelId="feature-select-label"
                            id="feature-select"
                            value={data.featureId || 'none'}
                            label="Feature"
                            onChange={(e) => handleFeatureIdChange(e.target.value)}
                        >
                            <MenuItem value="none">
                                <em>None</em>
                            </MenuItem>
                            {features.map((f) => (
                                <MenuItem key={f.id} value={f.id}>
                                    {f.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Autocomplete
                            options={allUsers}
                            getOptionLabel={(option) => option.displayName || option.email || 'Unknown User'}
                            value={allUsers.find(u => u.uid === data.assignedTo) || null}
                            onChange={(event, value) => {
                                if (onUpdate) onUpdate(data.id, { assignedTo: value?.uid || null });
                            }}
                            renderInput={(params) => <TextField {...params} label="Assigned To" size="small" />}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar size="small" src={option.photoURL} sx={{ width: 20, height: 20 }}>
                                        {(option.displayName || option.email || '?').charAt(0)}
                                    </Avatar>
                                    <Typography variant="body2">{option.displayName || option.email}</Typography>
                                </Box>
                            )}
                        />
                    </FormControl>
                </Box>

                {/* Metadata Section */}
                {(featureName || data.creatorName || data.createdAt) && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        {featureName && (
                            <Chip
                                label={featureName}
                                size="small"
                                sx={{
                                    backgroundColor: isBug ? 'error.main' : 'primary.main',
                                    color: isBug ? 'error.contrastText' : 'primary.contrastText',
                                }}
                            />
                        )}
                        {(data.creatorName || data.createdAt) && (
                            <Typography variant="caption" color="text.secondary">
                                Created by: {[data.creatorName, formatTimeAgo(data.createdAt)].filter(Boolean).join(' · ')}
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>

            {/* Archive Button */}
            <Tooltip title={data.archived ? "Unarchive" : "Archive"} placement="top">
                <IconButton
                    onClick={() => setArchiveConfirmOpen(true)}
                    sx={{
                        position: 'absolute',
                        right: 80,
                        bottom: 24,
                        bgcolor: alpha('#ff9800', 0.1),
                        color: 'warning.main',
                        boxShadow: 2,
                        zIndex: 2,
                        '&:hover': {
                            bgcolor: 'warning.main',
                            color: 'white',
                        }
                    }}
                >
                    {data.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                </IconButton>
            </Tooltip>

            {/* Delete Button */}
            <Tooltip title="Delete" placement="top">
                <IconButton
                    onClick={() => {
                        onDelete(data, isBug ? 'bug' : 'task');
                        onClose();
                    }}
                    sx={{
                        position: 'absolute',
                        right: 24,
                        bottom: 24,
                        bgcolor: alpha('#f44336', 0.1),
                        color: 'error.main',
                        boxShadow: 2,
                        zIndex: 2,
                        '&:hover': {
                            bgcolor: 'error.main',
                            color: 'white',
                        }
                    }}
                >
                    <DeleteIcon />
                </IconButton>
            </Tooltip>

            {/* Archive Confirmation Dialog */}
            <Dialog open={archiveConfirmOpen} onClose={() => setArchiveConfirmOpen(false)}>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {data.archived ? 'unarchive' : 'archive'} this {isBug ? 'bug' : 'task'}?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setArchiveConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleArchiveToggle} variant="contained" color="warning">
                        {data.archived ? 'Unarchive' : 'Archive'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default EnlargedCardModal;

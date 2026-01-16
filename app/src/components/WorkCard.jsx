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
import { useState, useEffect, useRef } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import BugReportIcon from '@mui/icons-material/BugReport';
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

const WorkCard = ({ work, featureName, onEdit, onDelete, onUpdate, autoFocus, isDraft, onSaveDraft, onCancelDraft }) => {
    const [enlarged, setEnlarged] = useState(false);
    const [editingTitle, setEditingTitle] = useState(isDraft || false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [editedTitle, setEditedTitle] = useState(isDraft ? '' : (work?.title || ''));
    const [editedDescription, setEditedDescription] = useState(isDraft ? '' : (work?.description || ''));
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

    const isBug = work?.type === 'BUG' || work?.type === 'bug'; // Handle both cases just in case
    const colorKey = isBug ? 'error' : 'primary';
    const iconColor = isBug ? 'error.main' : 'primary.main';

    useEffect(() => {
        if (autoFocus) {
            setEditedTitle(work.title);
            setEditingTitle(true);
        }
    }, [autoFocus, work.title]);

    const handleTitleClick = (e) => {
        e.stopPropagation();
        setEditedTitle(work.title);
        setEditingTitle(true);
    };

    const handleDescriptionClick = (e) => {
        e.stopPropagation();
        setEditedDescription(work.description || '');
        setEditingDescription(true);
    };

    const handleTitleSave = async () => {
        const trimmedTitle = editedTitle.trim();

        if (isDraft) {
            if (!trimmedTitle) {
                onCancelDraft();
            } else {
                await onSaveDraft(trimmedTitle);
                setEditingTitle(false);
            }
            return;
        }

        if (!trimmedTitle) {
            // Auto-delete if title cleared
            if (onDelete && work) {
                await onDelete(work);
            }
        } else if (trimmedTitle !== work.title && onUpdate) {
            await onUpdate(work.id, { title: trimmedTitle });
        }
        setEditingTitle(false);
    };

    const handleDescriptionSave = async () => {
        if (editedDescription !== work.description && onUpdate) {
            await onUpdate(work.id, { description: editedDescription });
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
            await onUpdate(work.id, { archived: !work.archived });
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
                    borderColor: `${colorKey}.light`,
                    borderLeft: '4px solid',
                    borderLeftColor: `${colorKey}.light`,
                    bgcolor: 'background.paper',
                    backgroundImage: (theme) => `linear-gradient(${alpha(theme.palette[colorKey].main, 0.04)}, ${alpha(theme.palette[colorKey].main, 0.04)})`,
                }}
            >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, flexShrink: 0 }}>
                        {/* Bug Icon */}
                        {isBug && (
                            <BugReportIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5, flexShrink: 0, mt: 0.3 }} />
                        )}

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
                                    flexGrow: 1,
                                    pr: 1,
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
                                    flexGrow: 1,
                                    pr: 1,
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
                                {work.title}
                            </Typography>
                        )}
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
                            {work.description || 'Click to add description...'}
                        </Typography>
                    )}

                    {work.tags && work.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, flexShrink: 0 }}>
                            {work.tags.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    sx={{
                                        height: 16,
                                        fontSize: '0.6rem',
                                        bgcolor: alpha(isBug ? '#f44336' : '#2196f3', 0.08),
                                        color: isBug ? 'error.dark' : 'primary.dark',
                                        borderColor: alpha(isBug ? '#f44336' : '#2196f3', 0.2),
                                        border: '1px solid',
                                    }}
                                />
                            ))}
                        </Box>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    {(featureName || work.creatorName || work.createdAt) && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 'auto', pt: 0.5, flexShrink: 0 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
                                {work.creatorName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {getInitials(work.creatorName)}
                                    </Typography>
                                )}
                                {work.createdAt && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
                                        · {formatTimeAgo(work.createdAt)}
                                    </Typography>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 0.5 }}>
                                    <ChatBubbleOutlineIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                        {work.comments?.length || 0}
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
                                            backgroundColor: `${colorKey}.main`,
                                            color: `${colorKey}.contrastText`,
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
                                            onDelete(work);
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
                        Are you sure you want to archive this {isBug ? 'bug' : 'task'}?
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
                data={work}
                featureName={featureName}
                onUpdate={onUpdate}
                onDelete={onDelete}
            />
        </>
    );
};

export default WorkCard;

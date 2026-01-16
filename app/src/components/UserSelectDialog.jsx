import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox,
    TextField,
    Box,
    Typography,
} from '@mui/material';
import { useState, useMemo } from 'react';

const UserSelectDialog = ({ open, onClose, users, assignedUserIds = [], onSave }) => {
    const [selectedIds, setSelectedIds] = useState(assignedUserIds);
    const [searchQuery, setSearchQuery] = useState('');

    // Reset selectedIds when dialog opens or assignedUserIds changes
    useMemo(() => {
        if (open) {
            setSelectedIds(assignedUserIds);
        }
    }, [open, assignedUserIds]);

    const handleToggle = (userId) => {
        setSelectedIds((prev) => {
            if (prev.includes(userId)) {
                return prev.filter((id) => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        return (
            user.displayName?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        );
    });

    const handleSave = () => {
        onSave(selectedIds);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Assign Users</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </Box>
                <List sx={{ pt: 0 }}>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                            <ListItem
                                key={user.uid}
                                disablePadding
                            >
                                <ListItemButton onClick={() => handleToggle(user.uid)}>
                                    <Checkbox
                                        checked={selectedIds.includes(user.uid)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                    <ListItemAvatar>
                                        <Avatar src={user.photoURL} alt={user.displayName}>
                                            {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={user.displayName || 'Unknown'}
                                        secondary={user.email}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                            No users found
                        </Typography>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserSelectDialog;

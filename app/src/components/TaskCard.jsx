import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { STATUS_LABELS } from '../utils/constants';

const TaskCard = ({ task, featureName, onEdit, onDelete, onStatusChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit(task);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(task);
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'grab',
        '&:hover': {
          boxShadow: 2,
        },
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, pr: 1 }}>
            {task.title}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ mt: -0.5, mr: -0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {task.description && (
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
            }}
          >
            {task.description}
          </Typography>
        )}

        {featureName && (
          <Chip
            label={featureName}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            }}
          />
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default TaskCard;

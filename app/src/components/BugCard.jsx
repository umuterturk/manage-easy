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
import BugReportIcon from '@mui/icons-material/BugReport';

const BugCard = ({ bug, featureName, onEdit, onDelete, onStatusChange }) => {
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
    onEdit(bug);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(bug);
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
        borderColor: 'error.main',
        borderLeftWidth: 4,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pr: 1 }}>
            <BugReportIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {bug.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ mt: -0.5, mr: -0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {bug.description && (
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
            {bug.description}
          </Typography>
        )}

        {featureName && (
          <Chip
            label={featureName}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              backgroundColor: 'error.main',
              color: 'error.contrastText',
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

export default BugCard;

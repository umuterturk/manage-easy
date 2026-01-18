import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Chip } from '@mui/material';
import StatusBadge from './StatusBadge';

const IdeaCard = ({ idea, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    navigate(`/ideas/${idea.id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(30,41,59,0.7)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: (theme) => theme.palette.gradient.primary,
          opacity: 0.8,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <StatusBadge status={idea.status} />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(idea);
                }}
                sx={{
                  color: 'primary.main',
                  bgcolor: 'primary.alpha10',
                  '&:hover': { bgcolor: 'primary.alpha20' }
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(idea);
                }}
                sx={{
                  color: 'error.main',
                  bgcolor: 'error.alpha10',
                  '&:hover': { bgcolor: 'error.alpha20' }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
            color: 'text.primary',
          }}
        >
          {idea.title}
        </Typography>

        {idea.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 2.5,
              lineHeight: 1.6,
            }}
          >
            {idea.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 'auto' }}>
          {idea.tags && idea.tags.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: 'text.secondary',
                border: 'none',
              }}
            />
          ))}
          {idea.tags && idea.tags.length > 3 && (
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', fontWeight: 600 }}>
              +{idea.tags.length - 3}
            </Typography>
          )}
        </Box>
      </CardContent>

      <Box sx={{ p: 3, pt: 2, mt: 'auto' }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
            {idea.features?.length || 0} features
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Updated {new Date(idea.updatedAt).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default IdeaCard;

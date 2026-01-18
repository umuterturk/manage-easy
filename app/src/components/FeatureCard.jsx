import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StatusBadge from './StatusBadge';

const FeatureCard = ({ feature, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    // Navigate to works page with feature filter
    navigate(`/ideas/${feature.ideaId}/works?features=${feature.id}`);
  };

  // Unified work item count
  const workCount = feature.workIds?.length || 0;

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(30,41,59,0.7)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 12px 24px -10px rgba(0,0,0,0.6)' : '0 12px 24px -10px rgba(0,0,0,0.1)',
        },
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
          <StatusBadge status={feature.status} />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(feature);
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
                  onDelete(feature);
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
          variant="h6"
          component="h3"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            fontSize: '1.1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
            color: 'text.primary',
          }}
        >
          {feature.title}
        </Typography>

        {feature.description && (
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
              minHeight: '4.8em', // Roughly 3 lines
            }}
          >
            {feature.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {feature.tags && feature.tags.map((tag) => (
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
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'secondary.main' }} />
            {workCount} work items
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default FeatureCard;

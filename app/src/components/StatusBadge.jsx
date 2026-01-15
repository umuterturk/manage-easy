import { Chip, useTheme } from '@mui/material';
import { STATUS_LABELS, STATUS_COLORS, STATUS_COLORS_DARK } from '../utils/constants';

const StatusBadge = ({ status, size = 'small' }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const statusColors = isDarkMode ? STATUS_COLORS_DARK : STATUS_COLORS;
  const color = statusColors[status] || statusColors.CREATED;

  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size={size}
      sx={{
        backgroundColor: `${color}20`, // 20% opacity
        color: color,
        fontWeight: 600,
        border: `1px solid ${color}40`,
      }}
    />
  );
};

export default StatusBadge;

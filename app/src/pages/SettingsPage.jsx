import {
  Box,
  Typography,
  Container,
  Paper,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useSettings } from '../contexts/SettingsContext';

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();

  const handleToggle = (setting) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        Settings
      </Typography>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          <ListItem sx={{ py: 3, px: 3 }}>
            <ListItemIcon>
              <AutoAwesomeIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Smart Redirect"
              secondary="Automatically go to your last visited idea page on login or site open."
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                checked={settings.redirectToLastIdea}
                onChange={() => handleToggle('redirectToLastIdea')}
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          <ListItem sx={{ py: 3, px: 3 }}>
            <ListItemIcon>
              <DarkModeIcon sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Appearance"
              secondary="Coming soon: Dark mode support will be unified here."
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                disabled
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          About User Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          These settings are currently saved to your browser's local storage.
          In a future update, they will be synced across all your devices using your account.
        </Typography>
      </Box>
    </Container>
  );
};

export default SettingsPage;

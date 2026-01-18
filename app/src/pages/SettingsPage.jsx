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
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import { useSettings } from '../contexts/SettingsContext';
import { getAuth } from 'firebase/auth';
import { useState } from 'react';

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleToggle = (setting) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  // Helper to make authenticated requests to our functions
  const callFunction = async (endpoint, options = {}) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const token = await user.getIdToken();
    // Default to Production URL for deployed app
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:5001/manage-easy-1768423759/us-central1'
      : 'https://us-central1-manage-easy-1768423759.cloudfunctions.net';

    const response = await fetch(`${baseUrl}/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Request failed');
    }
    return response.json();
  };

  const handleGenerateApiKey = async () => {
    try {
      const data = await callFunction('generateApiKey', { method: 'POST' });
      await navigator.clipboard.writeText(data.apiKey);
      setSnackbarMessage('New API Key generated and copied to clipboard!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error generating API key:', error);
      setSnackbarMessage(`Failed to generate key: ${error.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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

          <Divider />

          <ListItem sx={{ py: 3, px: 3 }}>
            <ListItemIcon>
              <IntegrationInstructionsIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Developer"
              secondary="Generate a permanent Personal Access Token for MCP integration. (Treat this like a password!)"
            />
            <ListItemSecondaryAction>
              <Button
                variant="outlined"
                size="small"
                color="warning"
                onClick={handleGenerateApiKey}
              >
                Generate API Key
              </Button>
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;

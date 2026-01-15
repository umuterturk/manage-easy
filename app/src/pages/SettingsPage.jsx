import { Box, Typography, Container } from '@mui/material';

const SettingsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your settings and get your Firebase token. Coming soon!
        </Typography>
      </Box>
    </Container>
  );
};

export default SettingsPage;

import { Box, Typography, Container } from '@mui/material';

const Dashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to Manage Easy! This is your dashboard.
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard;

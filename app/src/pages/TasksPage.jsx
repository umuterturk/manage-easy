import { Box, Typography, Container } from '@mui/material';

const TasksPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Tasks
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your tasks here. Coming soon!
        </Typography>
      </Box>
    </Container>
  );
};

export default TasksPage;

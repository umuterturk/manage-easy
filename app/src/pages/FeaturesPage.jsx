import { Box, Typography, Container } from '@mui/material';

const FeaturesPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Features
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your features here. Coming soon!
        </Typography>
      </Box>
    </Container>
  );
};

export default FeaturesPage;

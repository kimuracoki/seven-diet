import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function Header() {
  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar>
        <StorefrontIcon sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight={700}>
          セブンダイエット
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

import React, { useEffect, useState } from 'react';
import {
  AppBar, Box, Button, Card, CardActionArea, CardContent,
  CircularProgress, Container, Grid, Toolbar, Tooltip, Typography,
} from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import api, { Host } from '../api.ts';
import { useAuth } from '../auth-context.tsx';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Host[]>('/hosts')
      .then((r) => setHosts(r.data))
      .finally(() => setLoading(false));
  }, []);

  const hostWindows = React.useRef<Map<string, Window>>(new Map());

  function openHost(slug: string) {
    const existing = hostWindows.current.get(slug);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    // Named target reuses the tab if the ref was lost (e.g. after a page refresh)
    const win = window.open(`/kvm/${slug}/`, `kvm-host-${slug}`);
    if (win) hostWindows.current.set(slug, win);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar>
          <DnsIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>KVM Router</Typography>
          <Tooltip title="Manage Hosts">
            <Button startIcon={<SettingsIcon />} onClick={() => navigate('/admin')} color="inherit">
              Manage
            </Button>
          </Tooltip>
          <Tooltip title="Sign Out">
            <Button startIcon={<LogoutIcon />} onClick={logout} color="inherit">
              Sign Out
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && hosts.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary">No hosts configured yet.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/admin')}>
              Add Your First Host
            </Button>
          </Box>
        )}

        {!loading && hosts.length > 0 && (
          <Grid container spacing={3}>
            {hosts.map((host) => (
              <Grid key={host.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card sx={{ height: '100%', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <CardActionArea onClick={() => openHost(host.slug)} sx={{ height: '100%' }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 3 }}>
                      <DnsIcon color="primary" sx={{ fontSize: 48 }} />
                      <Typography variant="h6" textAlign="center">{host.name}</Typography>
                      <Typography variant="caption" color="text.secondary">/{host.slug}/</Typography>
                      <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

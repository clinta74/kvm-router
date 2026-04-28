import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import api, { Host } from '../api.ts';
import axios from 'axios';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface HostFormData {
  name: string;
  url: string;
  slug: string;
  max_body_size: string;
}

const emptyForm: HostFormData = { name: '', url: '', slug: '', max_body_size: '10m' };

export default function Admin() {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [form, setForm] = useState<HostFormData>(emptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchHosts = useCallback(async () => {
    const res = await api.get<Host[]>('/hosts');
    setHosts(res.data);
  }, []);

  useEffect(() => {
    fetchHosts().finally(() => setLoading(false));
  }, [fetchHosts]);

  function openCreate() {
    setEditingHost(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setError('');
    setDialogOpen(true);
  }

  function openEdit(host: Host) {
    setEditingHost(host);
    setForm({ name: host.name, url: host.url, slug: host.slug, max_body_size: host.max_body_size });
    setSlugManuallyEdited(true); // keep existing slug unless user clears it
    setError('');
    setDialogOpen(true);
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugManuallyEdited ? f.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug: slugify(value) || value.toLowerCase() }));
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      if (editingHost) {
        await api.put(`/hosts/${editingHost.id}`, {
          name: form.name,
          url: form.url,
          slug: form.slug,
          max_body_size: form.max_body_size,
        });
      } else {
        await api.post('/hosts', {
          name: form.name,
          url: form.url,
          slug: form.slug,
          max_body_size: form.max_body_size,
        });
      }
      await fetchHosts();
      setDialogOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Save failed');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(host: Host) {
    if (!window.confirm(`Delete "${host.name}"? This will remove the proxy route immediately.`)) return;
    await api.delete(`/hosts/${host.id}`);
    await fetchHosts();
  }

  async function moveHost(index: number, direction: -1 | 1) {
    const newHosts = [...hosts];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newHosts.length) return;
    [newHosts[index], newHosts[swapIndex]] = [newHosts[swapIndex], newHosts[index]];
    const reorderPayload = newHosts.map((h, i) => ({ id: h.id, order_index: i }));
    await api.put('/hosts/reorder', reorderPayload);
    await fetchHosts();
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar>
          <Tooltip title="Back to Dashboard">
            <IconButton edge="start" onClick={() => navigate('/')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Manage Hosts</Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            Add Host
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug (URL path)</TableCell>
                  <TableCell>Target URL</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No hosts yet. Click "Add Host" to get started.
                    </TableCell>
                  </TableRow>
                )}
                {hosts.map((host, idx) => (
                  <TableRow key={host.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Move Up">
                          <span>
                            <IconButton size="small" onClick={() => moveHost(idx, -1)} disabled={idx === 0}>
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move Down">
                          <span>
                            <IconButton size="small" onClick={() => moveHost(idx, 1)} disabled={idx === hosts.length - 1}>
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell><Typography fontWeight={600}>{host.name}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                        /{host.slug}/
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {host.url}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(host)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(host)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingHost ? 'Edit Host' : 'Add Host'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
            helperText="Display name shown on the dashboard"
          />
          <TextField
            label="Target URL"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            required
            placeholder="https://192.168.100.81:443"
            helperText="Full URL of the KVM/Proxmox host including port"
          />
          <TextField
            label="URL Slug"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            inputProps={{ pattern: '[a-z0-9-]+' }}
            helperText={`Accessible at /kvm/${form.slug || '<slug>'}/`}
          />
          <TextField
            label="Max Upload Size"
            value={form.max_body_size}
            onChange={(e) => setForm((f) => ({ ...f, max_body_size: e.target.value }))}
            placeholder="10m"
            helperText="nginx client_max_body_size — e.g. 10m, 500m, 2g (for ISO/image uploads)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name || !form.url || !form.slug}
          >
            {saving ? 'Saving...' : editingHost ? 'Save Changes' : 'Add Host'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

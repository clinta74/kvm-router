import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Container, TextField, Typography, Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import api from '../api.ts';
import axios from 'axios';

interface Props {
  onSetup: (token: string) => void;
}

export default function Setup({ onSetup }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ token: string }>('/auth/setup', { username, password });
      onSetup(res.data.token);
      window.location.href = '/';
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Setup failed');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <LockOutlinedIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5">Create Admin Account</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Welcome to KVM Router. Set up your admin account to get started.
            </Typography>
            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                required autoFocus inputProps={{ minLength: 3 }}
              />
              <TextField
                label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required inputProps={{ minLength: 8 }} helperText="Minimum 8 characters"
              />
              <TextField
                label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Container, TextField, Typography, Alert,
} from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import api from '../api.ts';
import axios from 'axios';

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ token: string }>('/auth/login', { username, password });
      onLogin(res.data.token);
      window.location.href = '/';
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed');
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
            <DnsIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5">KVM Router</Typography>
            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                required autoFocus
              />
              <TextField
                label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

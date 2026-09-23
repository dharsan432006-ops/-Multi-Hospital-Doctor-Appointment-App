import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI tree:', error, errorInfo);
    // If it's a dynamic module loading error (stale Vite dev chunk), auto reload once
    if (error.message?.includes('error loading dynamically imported module')) {
      const reloaded = sessionStorage.getItem('vite_chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('vite_chunk_reload', 'true');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    sessionStorage.removeItem('vite_chunk_reload');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              maxWidth: 500,
              width: '100%',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
              Oops, something went wrong
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              {this.state.error?.message?.includes('dynamically imported module')
                ? 'An updated application version was deployed or dev modules refreshed. Reloading will fix this immediately.'
                : this.state.error?.message || 'An unexpected application error occurred.'}
            </Typography>
            <Button
              variant="contained"
              onClick={this.handleReset}
              sx={{
                bgcolor: '#4f46e5',
                color: 'white',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                py: 1,
                '&:hover': { bgcolor: '#4338ca' },
              }}
            >
              🔄 Refresh Application
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

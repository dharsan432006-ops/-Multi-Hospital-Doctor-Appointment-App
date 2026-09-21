import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../i18n/index.js';

// Mock auth: anonymous patient-less user is not needed; Register uses useAuth().register
vi.mock('../auth/AuthContext.js', () => ({
  useAuth: () => ({ user: null, loading: false, login: vi.fn(), register: vi.fn().mockResolvedValue(undefined), logout: vi.fn(), refreshUser: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { Register } from '../pages/Register.js';

function setup() {
  const qc = new QueryClient();
  render(
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <Register />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('Register consent flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders four purpose checkboxes with Medical Care pre-checked', () => {
    setup();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(4);
    // MEDICAL_CARE + APPOINTMENT_COMMUNICATIONS pre-checked
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(2);
  });

  it('blocks submit without Medical Care consent', async () => {
    setup();
    fireEvent.change(screen.getByRole('textbox', { name: /full name/i }), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 't@example.test' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Test123!Pass' } });
    fireEvent.change(screen.getByRole('textbox', { name: /phone/i }), { target: { value: '+91-9000000001' } });
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]); // uncheck MEDICAL_CARE
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/must accept medical care/i)).toBeInTheDocument();
    });
  });
});

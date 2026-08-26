import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as AmplifyAuth from 'aws-amplify/auth';
import * as environment from '../utils/environment';

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  confirmSignUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

// Mock environment utils
vi.mock('../utils/environment', () => ({
  isLocalhost: vi.fn(),
  isLocalHostname: vi.fn(),
}));

// Test component to consume context
const TestComponent = () => {
  const { user, loading, isAuthenticated, signIn, signOut } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      {user && <div data-testid="username">{user.username}</div>}
      {user && <div data-testid="user-groups">{user.groups?.join(',')}</div>}
      <button onClick={() => signIn('testuser', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

import '@testing-library/jest-dom'; // Ensure matchers are available

describe('AuthContext', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // 既定はデプロイ済みホスト扱い（認証バイパスを許可しない）。
    // ローカル扱いにしたいテストだけ個別に true を返させる。
    vi.mocked(environment.isLocalHostname).mockReturnValue(false);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, hostname: 'localhost', search: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('sets dummy user in localhost environment', async () => {
    vi.mocked(environment.isLocalhost).mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    expect(screen.getByTestId('username')).toHaveTextContent('local-admin');
    expect(screen.getByTestId('user-groups')).toHaveTextContent('admin');
  });

  it('checks authentication in non-localhost environment', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
    });
    vi.mocked(environment.isLocalhost).mockReturnValue(false);
    vi.mocked(AmplifyAuth.getCurrentUser).mockResolvedValue({
      username: 'cognito-user',
      userId: '123',
      signInDetails: { loginId: 'test@example.com' },
    } as Awaited<ReturnType<typeof AmplifyAuth.getCurrentUser>>);
    vi.mocked(AmplifyAuth.fetchAuthSession).mockResolvedValue({
      tokens: {
        idToken: {
          payload: {
            'cognito:groups': ['user'],
          },
        },
      },
    } as Awaited<ReturnType<typeof AmplifyAuth.fetchAuthSession>>);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    expect(screen.getByTestId('username')).toHaveTextContent('cognito-user');
    expect(screen.getByTestId('user-groups')).toHaveTextContent('user');
  });

  it('handles authentication failure in non-localhost environment', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
    });
    vi.mocked(environment.isLocalhost).mockReturnValue(false);
    vi.mocked(AmplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Retry loop takes about 1.5s (3 * 500ms), so we need a longer timeout
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    }, { timeout: 3000 });
  });

  it('handles sign in', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
    });
    vi.mocked(environment.isLocalhost).mockReturnValue(false);
    // Initial state: always fail (simulating not authenticated)
    vi.mocked(AmplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial failure (retries take time)
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    }, { timeout: 3000 });

    // Setup success for subsequent calls
    vi.mocked(AmplifyAuth.signIn).mockResolvedValue({ isSignedIn: true } as Awaited<ReturnType<typeof AmplifyAuth.signIn>>);
    vi.mocked(AmplifyAuth.getCurrentUser).mockResolvedValue({
      username: 'signed-in-user',
      userId: '456',
    } as Awaited<ReturnType<typeof AmplifyAuth.getCurrentUser>>);
    vi.mocked(AmplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: {} } }
    } as Awaited<ReturnType<typeof AmplifyAuth.fetchAuthSession>>);

    const signInButton = screen.getByText('Sign In');
    await act(async () => {
      signInButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    expect(screen.getByTestId('username')).toHaveTextContent('signed-in-user');
  });

  it('handles sign out', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
    });
    vi.mocked(environment.isLocalhost).mockReturnValue(false); // Use non-localhost to test actual auth flow
    
    // Start authenticated
    vi.mocked(AmplifyAuth.getCurrentUser).mockResolvedValue({
      username: 'user',
      userId: '123',
    } as Awaited<ReturnType<typeof AmplifyAuth.getCurrentUser>>);
    vi.mocked(AmplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: { idToken: { payload: {} } }
    } as Awaited<ReturnType<typeof AmplifyAuth.fetchAuthSession>>);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Setup for after sign out (should fail to get user)
    vi.mocked(AmplifyAuth.signOut).mockResolvedValue(undefined);
    
    const signOutButton = screen.getByText('Sign Out');
    await act(async () => {
      signOutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
    expect(AmplifyAuth.signOut).toHaveBeenCalled();
  });
});

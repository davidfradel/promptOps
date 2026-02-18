import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockSubmitOnboarding = vi.fn();

vi.mock('../hooks/useOnboarding', () => ({
  useOnboarding: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'test@test.com', name: 'Test', onboardedAt: null },
    token: 'tok',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useOnboarding } from '../hooks/useOnboarding';
import { Onboarding } from './Onboarding';
import { CATEGORIES } from '@promptops/shared';

const mockUseOnboarding = vi.mocked(useOnboarding);

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows categories', () => {
    mockUseOnboarding.mockReturnValue({
      categories: CATEGORIES.slice(0, 3),
      loading: false,
      submitting: false,
      error: null,
      submitOnboarding: mockSubmitOnboarding,
    });

    render(<Onboarding />);

    expect(screen.getByText('SaaS')).toBeInTheDocument();
    expect(screen.getByText('Developer Tools')).toBeInTheDocument();
    expect(screen.getByText('AI & Machine Learning')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseOnboarding.mockReturnValue({
      categories: [],
      loading: true,
      submitting: false,
      error: null,
      submitOnboarding: mockSubmitOnboarding,
    });

    render(<Onboarding />);

    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('submit button disabled when nothing selected', () => {
    mockUseOnboarding.mockReturnValue({
      categories: CATEGORIES.slice(0, 3),
      loading: false,
      submitting: false,
      error: null,
      submitOnboarding: mockSubmitOnboarding,
    });

    render(<Onboarding />);

    const button = screen.getByRole('button', { name: 'Get Started (0 selected)' });
    expect(button).toBeDisabled();
  });

  it('submit button enabled after selecting a category', () => {
    mockUseOnboarding.mockReturnValue({
      categories: CATEGORIES.slice(0, 3),
      loading: false,
      submitting: false,
      error: null,
      submitOnboarding: mockSubmitOnboarding,
    });

    render(<Onboarding />);

    fireEvent.click(screen.getByText('SaaS'));

    const button = screen.getByRole('button', { name: 'Get Started (1 selected)' });
    expect(button).toBeEnabled();
  });
});

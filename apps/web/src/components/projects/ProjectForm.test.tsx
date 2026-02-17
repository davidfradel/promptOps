import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectForm } from './ProjectForm';

describe('ProjectForm', () => {
  it('does not render when closed', () => {
    render(<ProjectForm open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText('Create Project')).not.toBeInTheDocument();
  });

  it('renders form when open', () => {
    render(<ProjectForm open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText('Create Project', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My SaaS Research')).toBeInTheDocument();
  });

  it('calls onCreated with form data on submit', async () => {
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ProjectForm open={true} onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByPlaceholderText('My SaaS Research'), { target: { value: 'Test Project' } });
    fireEvent.change(screen.getByPlaceholderText('saas, devtools, ai (comma-separated)'), { target: { value: 'saas, devtools' } });
    fireEvent.change(screen.getByPlaceholderText('developer-tools'), { target: { value: 'devtools' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({
        name: 'Test Project',
        keywords: ['saas', 'devtools'],
        niche: 'devtools',
        description: undefined,
      });
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ProjectForm open={true} onClose={onClose} onCreated={vi.fn()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('disables submit button when name is empty', () => {
    render(<ProjectForm open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeDisabled();
  });

  it('enables submit button when name is provided', () => {
    render(<ProjectForm open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('My SaaS Research'), { target: { value: 'My Project' } });
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeEnabled();
  });

  it('resets form and calls onClose after successful submit', async () => {
    const onCreated = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ProjectForm open={true} onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByPlaceholderText('My SaaS Research'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('renders all form fields', () => {
    render(<ProjectForm open={true} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Niche')).toBeInTheDocument();
  });
});

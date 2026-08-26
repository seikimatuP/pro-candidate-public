import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';
import '@testing-library/jest-dom';

describe('LoadingSpinner', () => {
  test('renders loading message', () => {
    render(<LoadingSpinner />);
    const loadingElement = screen.getByText(/ページを読み込み中.../i);
    expect(loadingElement).toBeInTheDocument();
  });

  test('renders circular progress', () => {
    render(<LoadingSpinner />);
    const progressElement = screen.getByRole('progressbar');
    expect(progressElement).toBeInTheDocument();
  });
});

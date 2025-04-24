import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SolGuardian header', () => {
  render(<App />);
  const headerElement = screen.getByText(/SolGuardian/i);
  expect(headerElement).toBeInTheDocument();
});

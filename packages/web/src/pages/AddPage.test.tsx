import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {AddPage} from './AddPage.js';

describe('AddPage', () => {
  test('renders add options', async () => {
    await renderWithProviders(<AddPage />);
    expect(screen.getByText('Manual entry')).toBeInTheDocument();
    expect(screen.getByText('Import from URL')).toBeInTheDocument();
    expect(screen.getByText('Import from image')).toBeInTheDocument();
    expect(screen.getByText('Import from text')).toBeInTheDocument();
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
  });
});

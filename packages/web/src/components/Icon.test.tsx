import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {Icon} from './Icon.js';

describe('Icon', () => {
  test('renders a design-system icon', async () => {
    const {container} = await renderWithProviders(
      <Icon
        name="home"
        aria-label="Home"
      />,
    );
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('wraps the glyph when className and title are passed', async () => {
    const {container} = await renderWithProviders(
      <Icon
        name="alert-triangle"
        className="icon-amber"
        aria-label="Warning"
        title="Warning"
      />,
    );
    const wrapper = container.querySelector('span[title="Warning"]');
    expect(wrapper).toHaveClass('icon-amber');
    expect(wrapper).toHaveAttribute('title', 'Warning');
    expect(screen.getByLabelText('Warning')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('wraps the glyph when only a className is passed', async () => {
    const {container} = await renderWithProviders(
      <Icon
        name="message-circle"
        className="icon-white"
      />,
    );
    const wrapper = container.querySelector('span.icon-white');
    expect(wrapper).toHaveClass('icon-white');
    expect((wrapper as HTMLElement).style.display).toBe('inline-flex');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

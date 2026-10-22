import type {ReactNode} from 'react';
import clsx from 'clsx';
import {NavLink, Outlet} from 'react-router-dom';

import {Icon} from './Icon.js';

const navItems = [
  {to: '/', end: true, label: 'Home', icon: 'home' as const},
  {to: '/recipes', label: 'Recipes', icon: 'book-open' as const},
  {to: '/meals', label: 'Meals', icon: 'coffee' as const},
  {to: '/shared-with-me', label: 'Shared with me', icon: 'users' as const},
  {to: '/add', label: 'Add', icon: 'plus' as const},
  {to: '/tags', label: 'Tags', icon: 'tag' as const},
  {to: '/profile', label: 'Profile', icon: 'user' as const},
];

const navLinkClass = ({isActive}: {isActive: boolean}) =>
  clsx('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium', {
    'bg-primary text-white': isActive,
    'text-gray-700': !isActive,
    'hover:bg-gray-100': !isActive,
  });

type AppShellProps = {children?: ReactNode};

// The header wraps (#189): at phone widths the logo and the 7-item nav
// cannot share one row, so the nav wraps below the logo instead of
// overflowing the viewport and clipping labels. Desktop widths fit on
// one row, so the wrap never engages there.
export const AppShell = ({children}: AppShellProps) => (
  <div className="flex flex-col min-block-screen">
    <header className="border-be border-gray-200 bg-white">
      <div
        className="
          mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2
          px-4 py-3 max-inline-5xl
        "
      >
        <NavLink
          to="/"
          className="flex items-center"
        >
          <img
            src="/logo-horizontal.svg"
            alt="Eciperay"
            className="block-12"
          />
        </NavLink>
        <nav className="flex flex-wrap gap-1">
          {navItems.map(({to, end, label, icon}) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={navLinkClass}
            >
              <Icon
                name={icon}
                size={16}
              />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <main
      className="
      mx-auto flex flex-1 flex-col p-4 inline-full max-inline-5xl
    "
    >
      {children ?? <Outlet />}
    </main>
  </div>
);

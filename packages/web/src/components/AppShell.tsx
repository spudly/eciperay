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

export const AppShell = ({children}: AppShellProps) => (
  <div className="flex min-h-screen flex-col">
    <header className="border-b border-gray-200 bg-white">
      <div
        className="
          mx-auto flex max-w-5xl items-center justify-between px-4 py-3
        "
      >
        <NavLink
          to="/"
          className="flex items-center"
        >
          <img
            src="/logo-horizontal.svg"
            alt="Eciperay"
            className="h-12"
          />
        </NavLink>
        <nav className="flex gap-1">
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
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      {children ?? <Outlet />}
    </main>
  </div>
);

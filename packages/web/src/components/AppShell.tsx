import type {ReactNode} from 'react';
import clsx from 'clsx';
import {NavLink, Outlet} from 'react-router-dom';

const navLinkClass = ({isActive}: {isActive: boolean}) =>
  clsx('rounded-lg px-3 py-2 text-sm font-medium', {
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
          className="text-primary text-lg font-bold"
        >
          Eciperay
        </NavLink>
        <nav className="flex gap-1">
          <NavLink
            to="/"
            end
            className={navLinkClass}
          >
            Home
          </NavLink>
          <NavLink
            to="/recipes"
            className={navLinkClass}
          >
            Recipes
          </NavLink>
          <NavLink
            to="/shared-with-me"
            className={navLinkClass}
          >
            Shared with me
          </NavLink>
          <NavLink
            to="/add"
            className={navLinkClass}
          >
            Add
          </NavLink>
          <NavLink
            to="/tags"
            className={navLinkClass}
          >
            Tags
          </NavLink>
          <NavLink
            to="/profile"
            className={navLinkClass}
          >
            Profile
          </NavLink>
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      {children ?? <Outlet />}
    </main>
  </div>
);

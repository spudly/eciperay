import {useAuth} from '@recipoo/client';
import {useNavigate} from 'react-router-dom';

import {supabase} from '../lib/supabase.js';

export const ProfilePage = () => {
  const {session} = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    void navigate('/login');
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mb-2 text-gray-700">{session?.user.email}</p>
      <button
        type="button"
        className="
          rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600
        "
        onClick={() => {
          void handleSignOut();
        }}
      >
        Sign Out
      </button>
    </div>
  );
};

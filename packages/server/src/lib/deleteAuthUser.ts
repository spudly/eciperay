import {supabase} from '../supabase.js';

export const deleteAuthUser = async (supabaseUid: string) => {
  const {error} = await supabase.auth.admin.deleteUser(supabaseUid);
  if (error) {
    throw new Error(error.message);
  }
};

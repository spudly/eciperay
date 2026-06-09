import {API_BASE_URL as RAW_API_BASE_URL} from '@env';

export {SUPABASE_ANON_KEY, SUPABASE_URL} from '@env';

export const API_BASE_URL: string =
  typeof RAW_API_BASE_URL === 'string'
    ? RAW_API_BASE_URL
    : 'http://localhost:8080';

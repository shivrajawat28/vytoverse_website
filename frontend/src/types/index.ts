export interface User {
  id: number;
  name: string;
  username: string | null;
  email: string;
  profile_image: string | null;
  bio: string | null;
  department: string | null;
  role: 'user' | 'admin';
  stars: number;
  team_membership: number;
  team_role: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  is_active: number;
  created_at: string | null;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  short_description: string | null;
  date: string;
  time_start: string | null;
  time_end: string | null;
  location: string | null;
  image: string | null;
  invitation_file: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registration_url: string | null;
  poster_url: string | null;
  invitation_url: string | null;
  max_participants: number | null;
  created_at: string | null;
}

export interface LibraryResource {
  id: number;
  title: string;
  description: string | null;
  category: string;
  resource_type: 'pdf' | 'document' | 'link' | 'video' | 'tutorial' | 'note' | 'other';
  file_url: string | null;
  external_url: string | null;
  author: string | null;
  uploaded_by: number | null;
  downloads: number;
  created_at: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  assigned_user_id: number;
  assigned_user_name: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Poster {
  id: number;
  title: string | null;
  image_url: string;
  target_url: string | null;
  active: boolean;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ImportantLink {
  id: number;
  title: string;
  description: string | null;
  url: string;
  assigned_user_id: number;
  assigned_user_name: string | null;
  active: boolean;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Stats {
  total_users: number;
  active_members: number;
  total_events: number;
  upcoming_events: number;
  total_resources: number;
  total_admins: number;
  team_members: number;
  active_tasks: number;
  active_posters: number;
  total_links: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  username?: string;
  email: string;
  password: string;
}

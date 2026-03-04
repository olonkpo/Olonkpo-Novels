export interface Project {
  id: number;
  name: string;
  description: string;
  synopsis: string;
  outline: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  project_id: number;
  title: string;
  content: string;
  beats: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CodexEntry {
  id: number;
  project_id: number;
  type: 'character' | 'location' | 'object' | 'lore' | 'subplot' | 'other';
  name: string;
  description: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

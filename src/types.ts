export interface Project {
  id: number;
  name: string;
  description: string;
  synopsis: string;
  outline: string;
  created_at: string;
}

export interface Chapter {
  id: number;
  project_id: number;
  title: string;
  content: string;
  order_index: number;
}

export interface CodexEntry {
  id: number;
  project_id: number;
  type: 'character' | 'location' | 'object' | 'lore' | 'subplot' | 'other';
  name: string;
  description: string;
  content: string;
}

export interface Setting {
  key: string;
  value: string;
}

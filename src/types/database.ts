export interface Database {
  public: {
    Tables: {
      mindmap_pages: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          nodes: any;
          created_at: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          nodes: any;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          nodes?: any;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
        };
      };
    };
  };
}

export interface MindmapPage {
  id: string;
  title: string;
  description: string | null;
  nodes: any;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}
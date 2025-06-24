import { supabase } from '../lib/supabase';
import { MindmapPage } from '../types/database';
import { MindMapNode } from '../types/mindmap';

export class MindmapService {
  static async getAllPages(): Promise<MindmapPage[]> {
    const { data, error } = await supabase
      .from('mindmap_pages')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching mindmap pages:', error);
      throw error;
    }

    return data || [];
  }

  static async getPageById(id: string): Promise<MindmapPage | null> {
    const { data, error } = await supabase
      .from('mindmap_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Page not found
      }
      console.error('Error fetching mindmap page:', error);
      throw error;
    }

    return data;
  }

  static async createPage(title: string, description?: string): Promise<MindmapPage> {
    // Create initial root node
    const rootNodeId = crypto.randomUUID();
    const initialNodes = {
      [rootNodeId]: {
        id: rootNodeId,
        title: 'Main Topic',
        position: { x: 400, y: 300 },
        color: '#000000',
        isCompleted: false,
        isCollapsed: false,
        parentId: null,
        childrenIds: [],
        level: 0,
        isSelected: true,
        isEditing: false,
      }
    };

    const { data, error } = await supabase
      .from('mindmap_pages')
      .insert({
        title,
        description,
        nodes: {
          nodes: initialNodes,
          rootNodeId: rootNodeId
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating mindmap page:', error);
      throw error;
    }

    return data;
  }

  static async updatePage(id: string, updates: Partial<Pick<MindmapPage, 'title' | 'description' | 'nodes'>>): Promise<MindmapPage> {
    const { data, error } = await supabase
      .from('mindmap_pages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mindmap page:', error);
      throw error;
    }

    return data;
  }

  static async deletePage(id: string): Promise<void> {
    const { error } = await supabase
      .from('mindmap_pages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting mindmap page:', error);
      throw error;
    }
  }

  static async duplicatePage(id: string): Promise<MindmapPage> {
    const originalPage = await this.getPageById(id);
    if (!originalPage) {
      throw new Error('Page not found');
    }

    const { data, error } = await supabase
      .from('mindmap_pages')
      .insert({
        title: `${originalPage.title} (Copy)`,
        description: originalPage.description,
        nodes: originalPage.nodes
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating mindmap page:', error);
      throw error;
    }

    return data;
  }

  static async saveMindmapData(pageId: string, nodes: Record<string, MindMapNode>, rootNodeId: string): Promise<void> {
    await this.updatePage(pageId, {
      nodes: {
        nodes,
        rootNodeId
      }
    });
  }
}
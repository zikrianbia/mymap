import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Calendar, 
  Edit3, 
  Trash2, 
  Copy, 
  ExternalLink,
  Grid,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  FileText
} from 'lucide-react';
import { MindmapService } from '../services/mindmapService';
import { MindmapPage } from '../types/database';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<MindmapPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageDescription, setNewPageDescription] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await MindmapService.getAllPages();
      setPages(data);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    
    try {
      const newPage = await MindmapService.createPage(
        newPageTitle.trim(),
        newPageDescription.trim() || undefined
      );
      setPages(prev => [newPage, ...prev]);
      setShowCreateModal(false);
      setNewPageTitle('');
      setNewPageDescription('');
      navigate(`/mindmap/${newPage.id}`);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mindmap? This action cannot be undone.')) {
      return;
    }
    
    try {
      await MindmapService.deletePage(id);
      setPages(prev => prev.filter(page => page.id !== id));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handleDuplicatePage = async (id: string) => {
    try {
      const duplicatedPage = await MindmapService.duplicatePage(id);
      setPages(prev => [duplicatedPage, ...prev]);
    } catch (error) {
      console.error('Failed to duplicate page:', error);
    }
  };

  const filteredAndSortedPages = pages
    .filter(page => 
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.description && page.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
        default:
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNodeCount = (page: MindmapPage) => {
    if (!page.nodes || !page.nodes.nodes) return 0;
    return Object.keys(page.nodes.nodes).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your mindmaps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Mindmaps</h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {pages.length} {pages.length === 1 ? 'mindmap' : 'mindmaps'}
              </span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>New Mindmap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search mindmaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-2">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'updated' | 'created' | 'title');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="updated-desc">Recently Updated</option>
              <option value="created-desc">Recently Created</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>

            {/* View Mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredAndSortedPages.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <div>
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mindmaps found</h3>
                <p className="text-gray-500">Try adjusting your search terms</p>
              </div>
            ) : (
              <div>
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mindmaps yet</h3>
                <p className="text-gray-500 mb-4">Create your first mindmap to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Mindmap
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedPages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 truncate flex-1 mr-2">
                      {page.title}
                    </h3>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicatePage(page.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePage(page.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {page.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {page.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span>{formatDate(page.updated_at)}</span>
                    </span>
                    <span>{getNodeCount(page)} nodes</span>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/mindmap/${page.id}`)}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <ExternalLink size={16} />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="divide-y divide-gray-200">
              {filteredAndSortedPages.map((page) => (
                <div key={page.id} className="p-6 hover:bg-gray-50 group">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {page.title}
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {getNodeCount(page)} nodes
                        </span>
                      </div>
                      {page.description && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {page.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>Updated {formatDate(page.updated_at)}</span>
                        </span>
                        <span>Created {formatDate(page.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/mindmap/${page.id}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <ExternalLink size={16} />
                        <span>Open</span>
                      </button>
                      <button
                        onClick={() => handleDuplicatePage(page.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        title="Duplicate"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePage(page.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Mindmap</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="Enter mindmap title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newPageDescription}
                    onChange={(e) => setNewPageDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPageTitle('');
                    setNewPageDescription('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Mindmap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
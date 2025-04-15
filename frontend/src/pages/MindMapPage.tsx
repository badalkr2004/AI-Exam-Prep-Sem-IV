import { useState, useEffect } from 'react';
import axios from 'axios';
import MindMap from '../components/MindMap';
import { 
  PlusIcon, 
  AcademicCapIcon, 
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Define API URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children: string[];
}

interface MindMapData {
  id: string;
  title: string;
  root_node_id: string;
  rootNodeId?: string;
  nodes: Record<string, MindMapNode>;
  subject: string;
  created_at: string;
}

const MindMapPage = () => {
  const [mindMaps, setMindMaps] = useState<MindMapData[]>([]);
  const [selectedMindMap, setSelectedMindMap] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    fetchMindMaps();
  }, []);

  useEffect(() => {
    if (selectedMindMap) {
      const date = new Date(selectedMindMap.created_at);
      setFormattedDate(date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    }
  }, [selectedMindMap]);

  const fetchMindMaps = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/mindmaps`);
      console.log("Mind maps response:", response.data);
      setMindMaps(response.data || []);
    } catch (error) {
      console.error('Error fetching mind maps:', error);
      setMindMaps([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMindMap = async () => {
    if (!subject) {
      alert('Please enter a subject');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/mindmap/generate`, {
        subject,
        topic: topic || undefined
      });
      console.log("Generated mind map:", response.data);
      setMindMaps(prev => [...prev, response.data]);
      setSelectedMindMap(response.data);
      setSubject('');
      setTopic('');
    } catch (error) {
      console.error('Error generating mind map:', error);
      alert('Failed to generate mind map. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Ensure MindMap has valid props
  const getValidMindMapProps = () => {
    if (!selectedMindMap) return null;
    
    const rootNodeId = selectedMindMap.root_node_id || selectedMindMap.rootNodeId;
    if (!rootNodeId || !selectedMindMap.nodes || !selectedMindMap.nodes[rootNodeId]) {
      console.error("Invalid mind map data:", selectedMindMap);
      return null;
    }
    
    // Ensure all nodes have a children array
    const validatedNodes = { ...selectedMindMap.nodes };
    Object.keys(validatedNodes).forEach(nodeId => {
      validatedNodes[nodeId] = {
        ...validatedNodes[nodeId],
        children: validatedNodes[nodeId].children || []
      };
    });
    
    return {
      title: selectedMindMap.title,
      rootNodeId,
      nodes: validatedNodes
    };
  };

  return (
    <div className="flex h-[calc(100vh-136px)]">
      {/* Mobile sidebar toggle */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-20 left-4 z-30 bg-purple-600 text-white rounded-full p-2 shadow-lg"
      >
        {showSidebar ? (
          <ChevronLeftIcon className="h-5 w-5" />
        ) : (
          <ChevronRightIcon className="h-5 w-5" />
        )}
      </button>

      {/* Sidebar */}
      <div 
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 fixed md:static z-20 w-72 h-full bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-md overflow-hidden flex flex-col`}
      >
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900">Generate Mind Map</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic (optional)</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Calculus"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={generateMindMap}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2.5 rounded-md shadow-md transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isLoading || !subject.trim()}
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  <span>Generate Mind Map</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Saved Mind Maps</h2>
            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {mindMaps.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <AcademicCapIcon className="mx-auto h-10 w-10 mb-2" />
                  <p>No mind maps yet</p>
                  <p className="text-sm">Generate a new mind map to begin</p>
                </div>
              ) : (
                mindMaps.map(mindMap => (
                  <div
                    key={mindMap.id}
                    onClick={() => setSelectedMindMap(mindMap)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm group ${
                      selectedMindMap?.id === mindMap.id 
                        ? 'bg-white shadow-sm border-l-4 border-purple-500' 
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{mindMap.title}</div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{mindMap.subject}</span>
                      <span>{new Date(mindMap.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedMindMap ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {selectedMindMap.title}
              </h1>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-3">Subject: {selectedMindMap.subject}</span>
                <span>Created: {formattedDate}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden bg-white p-2">
              <div className="h-full rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
                {getValidMindMapProps() && (
                  <MindMap
                    title={getValidMindMapProps()!.title}
                    rootNodeId={getValidMindMapProps()!.rootNodeId}
                    nodes={getValidMindMapProps()!.nodes}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 p-6 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
              <AcademicCapIcon className="h-10 w-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Mind Maps</h2>
            <p className="text-gray-600 max-w-md mb-8">
              Create visual representations of concepts and their relationships. Mind maps help organize ideas and improve understanding.
            </p>
            {mindMaps.length > 0 ? (
              <p className="text-purple-600 font-medium">Select a mind map from the sidebar to view it</p>
            ) : (
              <button
                onClick={() => document.querySelector('input')?.focus()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-105"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Your First Mind Map</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapPage; 
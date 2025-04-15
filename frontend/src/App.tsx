import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { 
  DocumentArrowUpIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon, 
  XMarkIcon,
  AcademicCapIcon,
  BookOpenIcon,
  PresentationChartBarIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeMathjax from 'rehype-mathjax'

// Import new components

import MindMap from './components/MindMap'
import LearningModule from './components/LearningModule'
import PodcastPlayer from './components/PodcastPlayer'
import ExamPaperUploader from './components/ExamPaperUploader'

import LandingPage from './components/LandingPage'

// Define MathJax configuration options for better rendering
const mathJaxOptions = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined', 'autoload', 'color', 'newcommand'],
    macros: {
      // Add some common LaTeX macros if needed
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}"
    }
  },
  svg: {
    fontCache: 'global',
    scale: 1.2, // Slightly larger for better readability
    minScale: 0.5,
    mtextInheritFont: false,
    merrorInheritFont: true,
    mathmlSpacing: false,
  },
  displayAlign: 'left',
  output: 'svg', // Use SVG output for better quality
  chtml: {
    scale: 1.2,
  },
  loader: {
    load: ['[tex]/autoload', '[tex]/noerrors', '[tex]/color', '[tex]/newcommand']
  }
};

// Add a helper component for consistent markdown rendering
const MarkdownWithMath = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
    >
      {children}
    </ReactMarkdown>
  );
};

// Define types
type InputType = 'landing' | 'exam' | 'mindmap' | 'analysis' | 'podcast' | 'chat' | 'pdf' | 'text';
// type SummaryType = 'summarize' | 'elaborate' | 'learn';

// MindMap types
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

// Learning Module types
interface LearningModuleData {
  id: string;
  title: string;
  subject: string;
  content: string;
  relatedQuestions: string[];
}

// Podcast types 
interface PodcastData {
  id: string;
  title: string;
  subject: string;
  transcript: string;
  audioPath?: string; 
  durationSeconds?: number;
}

// Exam Paper types
interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  year?: string;
  filePath: string;
  uploadedAt: string;
  metadata: Record<string, unknown>;
}

// Chat types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  messages: ChatMessage[];
  domain?: string;
}

interface SessionListItem {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

function App() {
  // App state
  const [inputType, setInputType] = useState<InputType>('landing')
  const [showLandingPage, setShowLandingPage] = useState(true)
  
  // Common state
  // const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
 
  // const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  
  // PDF/Text state from old version
  // const [file, setFile] = useState<File | null>(null)
  // const [text, setText] = useState<string>('')
  // const [summaryType] = useState<SummaryType>('summarize')
  
  // Chat state
  const [chatSessions, setChatSessions] = useState<SessionListItem[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [chatMessage, setChatMessage] = useState<string>('')
  const [useContext, setUseContext] = useState<boolean>(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // New state for exam papers
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([])
  const [showUploader, setShowUploader] = useState(false)
  
  // State for mind maps
  const [mindMaps, setMindMaps] = useState<MindMapData[]>([])
  const [currentMindMap, setCurrentMindMap] = useState<MindMapData | null>(null)
  const [generatingMindMap, setGeneratingMindMap] = useState(false)
  const [mindMapSubject, setMindMapSubject] = useState('')
  const [mindMapTopic, setMindMapTopic] = useState('')
  
  // State for learning modules
  const [learningModules, setLearningModules] = useState<LearningModuleData[]>([])
  const [currentModule, setCurrentModule] = useState<LearningModuleData | null>(null)
  const [generatingModule, setGeneratingModule] = useState(false)
  const [moduleSubject, setModuleSubject] = useState('')
  const [moduleTopic, setModuleTopic] = useState('')
  
  // State for podcasts
  const [podcasts, setPodcasts] = useState<PodcastData[]>([])
  const [currentPodcast, setCurrentPodcast] = useState<PodcastData | null>(null)
  const [generatingPodcast, setGeneratingPodcast] = useState(false)
  const [podcastSubject, setPodcastSubject] = useState('')
  const [podcastTopic, setPodcastTopic] = useState('')
  const [podcastDuration, setPodcastDuration] = useState(0) // Default 10 minutes
  
  // Store speech synthesis objects
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  // Load data based on current view
  useEffect(() => {
    if (inputType === 'chat') {
      fetchChatSessions();
    } else if (inputType === 'exam') {
      fetchExamPapers();
    } else if (inputType === 'mindmap') {
      fetchMindMaps();
    } else if (inputType === 'analysis') {
      fetchLearningModules();
    } else if (inputType === 'podcast') {
      fetchPodcasts();
    }
  }, [inputType]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (currentSession && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);

  // Fetch exam papers
  const fetchExamPapers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://ai-backend.bitbrains.fun/exam/papers');
      setExamPapers(response.data.papers);
    } catch (err) {
      console.error('Failed to fetch exam papers:', err);
      setError('Failed to load exam papers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch mind maps
  const fetchMindMaps = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://ai-backend.bitbrains.fun/mindmaps');
      setMindMaps(response.data);
    } catch (err) {
      console.error('Failed to fetch mind maps:', err);
      setError('Failed to load mind maps');
    } finally {
      setLoading(false);
    }
  };

  // Fetch learning modules
  const fetchLearningModules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://ai-backend.bitbrains.fun/analyses');
      
      // Ensure each module has required properties
      const formattedModules = response.data.map((module: any) => ({
        id: module.id || module.title.replace(/\s+/g, '_').toLowerCase(),
        title: module.title,
        subject: module.subject,
        content: module.content,
        relatedQuestions: module.related_questions || []
      }));
      
      setLearningModules(formattedModules);
      
      // Set sample module data for development if needed
      if (formattedModules.length === 0) {
        console.log('No learning modules found, setting sample data');
        // You can add sample data here if needed
      }
    } catch (err) {
      console.error('Failed to fetch learning modules:', err);
      setError('Failed to load learning modules');
    } finally {
      setLoading(false);
    }
  };

  // Fetch podcasts
  const fetchPodcasts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://ai-backend.bitbrains.fun/podcasts');
      setPodcasts(response.data);
    } catch (err) {
      console.error('Failed to fetch podcasts:', err);
      setError('Failed to load podcasts');
    } finally {
      setLoading(false);
    }
  };

  // Generate a mind map
  const generateMindMap = async () => {
    if (!mindMapSubject.trim()) {
      setError('Please enter a subject');
      return;
    }

    try {
      setError('');
      setGeneratingMindMap(true);
      
      const response = await axios.post('https://ai-backend.bitbrains.fun/mindmap/generate', {
        subject: mindMapSubject,
        topic: mindMapTopic.trim() || undefined
      });
      
      // Add new mind map to state
      setMindMaps(prev => [...prev, response.data]);
      setCurrentMindMap(response.data);
      
      // Clear input fields
      setMindMapSubject('');
      setMindMapTopic('');
    } catch (err) {
      console.error('Failed to generate mind map:', err);
      setError('Failed to generate mind map. Please try again.');
    } finally {
      setGeneratingMindMap(false);
    }
  };

  // Generate a learning module
  const generateLearningModule = async () => {
    if (!moduleSubject.trim()) {
      setError('Please enter a subject');
      return;
    }

    try {
      setError('');
      setGeneratingModule(true);
      
      const response = await axios.post('https://ai-backend.bitbrains.fun/analysis/generate', {
        subject: moduleSubject,
        topic: moduleTopic.trim() || undefined
      });
      
      // Add new module to state
      setLearningModules(prev => [...prev, response.data]);
      setCurrentModule(response.data);
      
      // Clear input fields
      setModuleSubject('');
      setModuleTopic('');
    } catch (err) {
      console.error('Failed to generate learning module:', err);
      setError('Failed to generate learning module. Please try again.');
    } finally {
      setGeneratingModule(false);
    }
  };

  // Generate a podcast
  const generatePodcast = async () => {
    if (!podcastSubject.trim()) {
      setError('Please enter a subject');
      return;
    }

    try {
      setError('');
      setGeneratingPodcast(true);
      
      const response = await axios.post('https://ai-backend.bitbrains.fun/podcast/generate', {
        subject: podcastSubject,
        topic: podcastTopic.trim() || undefined,
        duration_minutes: podcastDuration
      });
      
      // Add new podcast to state
      setPodcasts(prev => [...prev, response.data]);
      setCurrentPodcast(response.data);
      
      // Clear input fields
      setPodcastSubject('');
      setPodcastTopic('');
    } catch (err) {
      console.error('Failed to generate podcast:', err);
      setError('Failed to generate podcast. Please try again.');
    } finally {
      setGeneratingPodcast(false);
    }
  };

  // Handle exam paper upload completion
  const handleUploadComplete = () => {
    setShowUploader(false);
    fetchExamPapers();
  };

  // Plain text version of the result (without markdown)
  // const getPlainTextResult = () => {
  //   // Strip markdown syntax for better text-to-speech
  //   return result
  //     .replace(/\$\$(.*?)\$\$/g, '') // Remove block math formulas
  //     .replace(/\$(.*?)\$/g, '') // Remove inline math formulas
  //     .replace(/#+\s/g, '') // Remove markdown headings
  //     .replace(/\*\*(.*?)\*\*/g, '$1') // Convert bold to plain text
  //     .replace(/\*(.*?)\*/g, '$1') // Convert italic to plain text
  //     .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Convert links to just the text
  //     .replace(/```.*?```/gs, '') // Remove code blocks
  //     .replace(/`(.*?)`/g, '$1'); // Remove inline code
  // };

  // Initialize speech synthesis
  const initSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  };

  // Handle text-to-speech playback
  /*
  const _handleSpeak = () => {
    if (!result) return;
    
    // Initialize speech synthesis if not already done
    if (!speechSynthesisRef.current) {
      initSpeechSynthesis();
    }
    
    // If already speaking, stop it
    if (isSpeaking) {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      setIsSpeaking(false);
      return;
    }
    
    // Create new utterance with plain text result
    const utterance = new SpeechSynthesisUtterance(getPlainTextResult());
    utteranceRef.current = utterance;
    
    // Set voice to a natural sounding one if available
    if (speechSynthesisRef.current) {
      const voices = speechSynthesisRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || voice.name.includes('Natural') || 
        voice.name.includes('Premium') || voice.name.includes('Daniel')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    // Set speech properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Add event handlers
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    // Start speaking
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };
  */

  // PDF/Text handlers
  /*
  const _handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const _handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  // Get the action button text based on the summary type
  const _getActionButtonText = () => {
    if (loading) return 'Processing...';
    
    switch (summaryType) {
      case 'summarize': return 'Generate Summary';
      case 'elaborate': return 'Elaborate Content';
      case 'learn': return 'Create Learning Materials';
      default: return 'Generate Summary';
    }
  };

  // Get the descriptive text for the current mode
  const _getModeDescription = () => {
    switch (summaryType) {
      case 'summarize':
        return 'Summarize mode condenses the content while preserving key information.';
      case 'elaborate':
        return 'Elaborate mode expands on the content with additional details and context.';
      case 'learn':
        return 'Learn mode creates educational materials with in-depth explanations, examples, and insights.';
      default:
        return '';
    }
  };

  const _handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((inputType === 'pdf') && !file) {
      setError('Please select a PDF file')
      return
    }

    if ((inputType === 'text') && !text.trim()) {
      setError('Please enter some text to summarize')
      return
    }

    // If speaking, stop it before generating new summary
    if (isSpeaking && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      let response;
      
      if (inputType === 'pdf') {
        const formData = new FormData()
        formData.append('file', file as File)
        formData.append('summary_type', summaryType)

        response = await axios.post('https://ai-backend.bitbrains.fun/summarize', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        response = await axios.post('https://ai-backend.bitbrains.fun/summarize-text', {
          text: text,
          summary_type: summaryType
        });
      }
      
      setResult(response.data.result)
    } catch (err) {
      setError(`Error processing the ${(inputType === 'pdf') ? 'PDF' : 'text'}. Please try again.`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  */
  
  // Chat handlers
  const fetchChatSessions = async () => {
    try {
      const response = await axios.get('https://ai-backend.bitbrains.fun/chat/sessions');
      setChatSessions(response.data.sessions);
    } catch (err) {
      console.error('Failed to fetch chat sessions:', err);
      setError('Failed to load chat sessions');
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const response = await axios.get(`https://ai-backend.bitbrains.fun/chat/session/${sessionId}`);
      setCurrentSession(response.data);
    } catch (err) {
      console.error('Failed to load chat session:', err);
      setError('Failed to load chat session');
    }
  };

  const startNewChatSession = () => {
    setCurrentSession({
      id: '',
      title: 'New Chat',
      created_at: new Date().toISOString(),
      messages: []
    });
    setChatMessage('');
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      await axios.delete(`https://ai-backend.bitbrains.fun/chat/session/${sessionId}`);
      // Update list and reset current session if it was deleted
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      fetchChatSessions();
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      setError('Failed to delete chat session');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatMessage.trim()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('https://ai-backend.bitbrains.fun/chat', {
        session_id: currentSession?.id || null,
        message: chatMessage,
        use_context: useContext
      });
      
      // Update current session
      setCurrentSession({
        id: response.data.session_id,
        title: response.data.title || currentSession?.title || 'New Chat',
        created_at: currentSession?.created_at || new Date().toISOString(),
        messages: [
          ...(currentSession?.messages || []),
          { role: 'user', content: chatMessage },
          { role: 'assistant', content: response.data.response }
        ]
      });
      
      // Clear message input
      setChatMessage('');
      
      // Refresh sessions list to get updated titles
      fetchChatSessions();
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setError('Failed to send chat message');
    } finally {
      setLoading(false);
    }
  };

  // Initialize speech synthesis on component mount
  useEffect(() => {
    initSpeechSynthesis();
    
    // Cleanup on unmount
    return () => {
      if (speechSynthesisRef.current && true) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Add this function to handle viewing a learning module
  const viewLearningModule = async (moduleId: string) => {
    try {
      setLoading(true);
      // First check if the module is already in state
      const existingModule = learningModules.find(m => m.id === moduleId);
      
      if (existingModule) {
        setCurrentModule(existingModule);
      } else {
        // Fetch the specific module from the API
        const response = await axios.get(`https://ai-backend.bitbrains.fun/analysis/${moduleId}`);
        const module = response.data;
        
        // Format the module data
        const formattedModule = {
          id: module.id || module.title.replace(/\s+/g, '_').toLowerCase(),
          title: module.title,
          subject: module.subject,
          content: module.content,
          relatedQuestions: module.related_questions || []
        };
        
        // Update state
        setCurrentModule(formattedModule);
        
        // Add to the modules list if not already there
        setLearningModules(prev => {
          if (!prev.some(m => m.id === formattedModule.id)) {
            return [...prev, formattedModule];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch learning module:', err);
      setError('Failed to load learning module');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showLandingPage ? (
        <LandingPage onGetStarted={() => setShowLandingPage(false)} />
      ) : (
        <div className="min-h-screen bg-gray-100">
          {/* Navigation header */}
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">ExamPrep AI</span>
                  </div>
                  <nav className="ml-8 flex space-x-4">
                    <button
                      onClick={() => setInputType('exam')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        inputType === 'exam'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <DocumentArrowUpIcon className="h-5 w-5 inline-block mr-1" />
                      Exam Papers
                    </button>
                    <button
                      onClick={() => setInputType('mindmap')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        inputType === 'mindmap'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <PresentationChartBarIcon className="h-5 w-5 inline-block mr-1" />
                      Mind Maps
                    </button>
                    <button
                      onClick={() => setInputType('analysis')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        inputType === 'analysis'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <BookOpenIcon className="h-5 w-5 inline-block mr-1" />
                      Learning
                    </button>
                    <button
                      onClick={() => setInputType('podcast')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        inputType === 'podcast'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <MusicalNoteIcon className="h-5 w-5 inline-block mr-1" />
                      Podcasts
                    </button>
                    <button
                      onClick={() => setInputType('chat')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        inputType === 'chat'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <ChatBubbleLeftRightIcon className="h-5 w-5 inline-block mr-1" />
                      Chat
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {/* Exam Papers View */}
              {inputType === 'exam' && (
                <div className="px-4 py-6 sm:px-0">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Exam Papers</h1>
                    <button
                      onClick={() => setShowUploader(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                      Upload Papers
                    </button>
                  </div>

                  {showUploader ? (
                    <ExamPaperUploader onUploadComplete={handleUploadComplete} />
                  ) : (
                    <div>
                      {loading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Loading exam papers...</p>
                        </div>
                      ) : examPapers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No exam papers</h3>
                          <p className="mt-1 text-gray-500">Get started by uploading your first exam paper.</p>
                          <div className="mt-6">
                            <button
                              onClick={() => setShowUploader(true)}
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                              Upload Papers
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {examPapers.map((paper) => (
                            <div
                              key={paper.id}
                              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
                            >
                              <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 truncate">{paper.title}</h3>
                                <div className="mt-2 flex items-center text-sm text-gray-500">
                                  <span className="truncate">Subject: {paper.subject}</span>
                                  {paper.year && (
                                    <span className="ml-2 flex-shrink-0">Year: {paper.year}</span>
                                  )}
                                </div>
                                <div className="mt-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Processed
                                  </span>
                                </div>
                              </div>
                              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                  <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                                    View Details
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mind Maps View */}
              {inputType === 'mindmap' && (
                <div className="px-4 py-6 sm:px-0">
                  {currentMindMap ? (
                    <div className="h-[calc(100vh-10rem)]">
                      <div className="mb-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">{currentMindMap.title}</h1>
                        <button
                          onClick={() => setCurrentMindMap(null)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Back to List
                        </button>
                      </div>
                      <div className="bg-white shadow-lg rounded-lg h-full">
                        <MindMap
                          title={currentMindMap.title}
                          rootNodeId={currentMindMap.rootNodeId || currentMindMap.root_node_id}
                          nodes={currentMindMap.nodes}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Mind Maps</h1>
                      </div>

                      <div className="mb-8 bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Mind Map</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="mindmap-subject" className="block text-sm font-medium text-gray-700">
                              Subject*
                            </label>
                            <input
                              type="text"
                              id="mindmap-subject"
                              value={mindMapSubject}
                              onChange={(e) => setMindMapSubject(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Mathematics, Computer Science"
                            />
                          </div>

                          <div>
                            <label htmlFor="mindmap-topic" className="block text-sm font-medium text-gray-700">
                              Topic (Optional)
                            </label>
                            <input
                              type="text"
                              id="mindmap-topic"
                              value={mindMapTopic}
                              onChange={(e) => setMindMapTopic(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Calculus, Data Structures"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={generateMindMap}
                            disabled={generatingMindMap || !mindMapSubject.trim()}
                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                              generatingMindMap || !mindMapSubject.trim()
                                ? 'bg-indigo-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {generatingMindMap ? 'Generating...' : 'Generate Mind Map'}
                          </button>
                        </div>
                      </div>

                      {/* Display list of mind maps */}
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                          {mindMaps.length > 0 ? (
                            mindMaps.map((mindMap) => (
                              <li key={mindMap.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">{mindMap.title}</h3>
                                    <p className="text-sm text-gray-500">
                                      Subject: {mindMap.subject}
                                      {mindMap.created_at && (
                                        <span className="ml-3">
                                          Created: {new Date(mindMap.created_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setCurrentMindMap({
                                      ...mindMap,
                                      rootNodeId: mindMap.root_node_id
                                    })}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50"
                                  >
                                    View
                                  </button>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="px-6 py-4 text-center text-gray-500">
                              {loading ? 'Loading mind maps...' : 'No mind maps found. Generate one to get started!'}
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Learning Module View */}
              {inputType === 'analysis' && (
                <div className="px-4 py-6 sm:px-0">
                  {currentModule ? (
                    <div className="mb-4">
                      <div className="mb-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">{currentModule.title}</h1>
                        <button
                          onClick={() => setCurrentModule(null)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Back to List
                        </button>
                      </div>
                      <LearningModule
                        title={currentModule.title}
                        subject={currentModule.subject}
                        content={currentModule.content}
                        relatedQuestions={currentModule.relatedQuestions}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Learning Modules</h1>
                      </div>

                      <div className="mb-8 bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Learning Module</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="moduleSubject" className="block text-sm font-medium text-gray-700">
                              Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="moduleSubject"
                              value={moduleSubject}
                              onChange={(e) => setModuleSubject(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Calculus"
                              disabled={generatingModule}
                            />
                          </div>
                          <div>
                            <label htmlFor="moduleTopic" className="block text-sm font-medium text-gray-700">
                              Specific Topic (Optional)
                            </label>
                            <input
                              type="text"
                              id="moduleTopic"
                              value={moduleTopic}
                              onChange={(e) => setModuleTopic(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Integration"
                              disabled={generatingModule}
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={generateLearningModule}
                            disabled={!moduleSubject.trim() || generatingModule}
                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                              !moduleSubject.trim() || generatingModule
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {generatingModule ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              'Generate Learning Module'
                            )}
                          </button>
                        </div>
                      </div>

                      {loading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Loading learning modules...</p>
                        </div>
                      ) : learningModules.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                          <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No learning modules</h3>
                          <p className="mt-1 text-gray-500">Create your first learning module using the form above.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {learningModules.map((module) => (
                            <div
                              key={module.id}
                              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300"
                              onClick={() => viewLearningModule(module.id)}
                            >
                              <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 truncate">{module.title}</h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <span>Subject: {module.subject}</span>
                                </div>
                              </div>
                              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                  <span className="font-medium text-indigo-600 hover:text-indigo-500">
                                    View Module
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Podcasts View */}
              {inputType === 'podcast' && (
                <div className="px-4 py-6 sm:px-0">
                  {currentPodcast ? (
                    <div className="mb-4">
                      <div className="mb-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">{currentPodcast.title}</h1>
                        <button
                          onClick={() => setCurrentPodcast(null)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Back to List
                        </button>
                      </div>
                      <PodcastPlayer
                        title={currentPodcast.title}
                        subject={currentPodcast.subject}
                        transcript={currentPodcast.transcript}
                        audioUrl={currentPodcast.audioPath}
                        durationSeconds={currentPodcast.durationSeconds}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Podcasts</h1>
                      </div>

                      <div className="mb-8 bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Podcast</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label htmlFor="podcastSubject" className="block text-sm font-medium text-gray-700">
                              Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="podcastSubject"
                              value={podcastSubject}
                              onChange={(e) => setPodcastSubject(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Calculus"
                              disabled={generatingPodcast}
                            />
                          </div>
                          <div>
                            <label htmlFor="podcastTopic" className="block text-sm font-medium text-gray-700">
                              Specific Topic (Optional)
                            </label>
                            <input
                              type="text"
                              id="podcastTopic"
                              value={podcastTopic}
                              onChange={(e) => setPodcastTopic(e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="e.g. Integration"
                              disabled={generatingPodcast}
                            />
                          </div>
                          <div>
                            <label htmlFor="podcastDuration" className="block text-sm font-medium text-gray-700">
                              Duration (minutes)
                            </label>
                            <input
                              type="text"
                              id="podcastDuration"
                              value={podcastDuration}
                              onChange={(e) => setPodcastDuration(parseInt(e.target.value) || 10)}
                              min="5"
                              max="10"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              disabled={generatingPodcast}
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={generatePodcast}
                            disabled={!podcastSubject.trim() || generatingPodcast}
                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                              !podcastSubject.trim() || generatingPodcast
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                          >
                            {generatingPodcast ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              'Generate Podcast'
                            )}
                          </button>
                        </div>
                      </div>

                      {loading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Loading podcasts...</p>
                        </div>
                      ) : podcasts.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                          <MusicalNoteIcon className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="mt-2 text-lg font-medium text-gray-900">No podcasts</h3>
                          <p className="mt-1 text-gray-500">Create your first podcast using the form above.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {podcasts.map((podcast) => (
                            <div
                              key={podcast.id}
                              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300"
                              onClick={() => setCurrentPodcast(podcast)}
                            >
                              <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg font-medium text-gray-900 truncate">{podcast.title}</h3>
                                <div className="mt-2 text-sm text-gray-500">
                                  <span>Subject: {podcast.subject}</span>
                                </div>
                                <div className="mt-2 text-sm text-gray-500">
                                  <span>Duration: {podcast.durationSeconds ? Math.floor(podcast.durationSeconds / 60) : '?'} minutes</span>
                                </div>
                              </div>
                              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                  <span className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Listen to Podcast
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Chat Interface */}
              {inputType === 'chat' && (
                <div className="flex h-[85vh]">
                  {/* Chat sidebar */}
                  <div className="w-1/5 border-r border-gray-200 pr-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
                      <button
                        onClick={startNewChatSession}
                        className="text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        New Chat
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {chatSessions.map(session => (
                        <div 
                          key={session.id}
                          className={`p-2 rounded-md flex justify-between items-center cursor-pointer ${
                            currentSession?.id === session.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => loadChatSession(session.id)}
                        >
                          <div className="truncate">
                            <p className="font-medium text-sm">{session.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(session.created_at).toLocaleDateString()} · {session.message_count / 2} messages
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      {chatSessions.length === 0 && (
                        <p className="text-sm text-gray-500 italic text-center py-4">
                          No conversations yet
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Chat main area */}
                  <div className="w-4/5 pl-4 flex flex-col">
                    {currentSession ? (
                      <>
                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[70vh] p-4">
                          {currentSession.messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                              <p className="text-gray-500 italic">Start a new conversation</p>
                            </div>
                          ) : (
                            currentSession.messages.map((message, index) => (
                              <div 
                                key={index} 
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`rounded-lg px-4 py-3 max-w-[85%] ${
                                    message.role === 'user' 
                                      ? 'bg-indigo-100 text-indigo-900' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  <MarkdownWithMath>
                                    {message.content}
                                  </MarkdownWithMath>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Chat input */}
                        <form onSubmit={handleChatSubmit} className="mt-auto">
                          <div className="flex mb-2">
                            <label className="flex items-center text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={useContext}
                                onChange={() => setUseContext(!useContext)}
                                className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                              />
                              Use semantic search for context
                            </label>
                          </div>
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <textarea
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                placeholder="Type your message here..."
                                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                rows={3}
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={loading || !chatMessage.trim()}
                              className={`px-4 py-2 rounded-md text-white ${
                                loading || !chatMessage.trim() 
                                  ? 'bg-gray-400' 
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              {loading ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-gray-500">
                          Select a conversation or start a new one
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

export default App

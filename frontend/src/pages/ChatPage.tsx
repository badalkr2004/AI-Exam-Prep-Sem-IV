import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MarkdownWithMath } from '../utils/MarkdownWithMath';
import { 
  PaperAirplaneIcon, 
  PlusIcon, 
  TrashIcon,
  ArrowPathIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

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

const ChatPage = () => {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatSessions();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);

  // Add a subtle animation to new messages
  useEffect(() => {
    if (messagesRef.current) {
      const messages = messagesRef.current.querySelectorAll('.message');
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        lastMessage.classList.add('animate-fade-in');
      }
    }
  }, [currentSession?.messages?.length]);

  const fetchChatSessions = async () => {
    try {
      const response = await axios.get('https://ai-backend.bitbrains.fun/chat/sessions');
      console.log("Chat sessions response:", response.data);
      setSessions(response.data?.sessions || []);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setSessions([]);
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`https://ai-backend.bitbrains.fun/chat/session/${sessionId}`);
      console.log("Loaded session:", response.data);
      setCurrentSession(response.data);
    } catch (error) {
      console.error('Error loading chat session:', error);
      alert('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChatSession = () => {
    setCurrentSession({
      id: 'new',
      title: 'New Chat',
      created_at: new Date().toISOString(),
      messages: []
    });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSession) return;

    setIsLoading(true);
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage
    };

    // Update UI immediately with user message
    setCurrentSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, userMessage]
      };
    });
    
    // Clear input immediately
    setInputMessage('');

    try {
      const response = await axios.post('https://ai-backend.bitbrains.fun/chat', {
        session_id: currentSession.id === 'new' ? null : currentSession.id,
        message: inputMessage,
        use_context: true
      });
      
      console.log("Chat response:", response.data);
      
      // If this was a new session, we need to update the session ID
      if (currentSession.id === 'new') {
        setCurrentSession({
          id: response.data.session_id,
          title: response.data.title || 'New Chat',
          created_at: new Date().toISOString(),
          messages: [
            userMessage,
            { role: 'assistant', content: response.data.response }
          ]
        });
        // Refresh the sessions list
        fetchChatSessions();
      } else {
        // Update the existing session
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [
              ...prev.messages, 
              { role: 'assistant', content: response.data.response }
            ]
          };
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error in chat
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [
            ...prev.messages, 
            { 
              role: 'assistant', 
              content: "Sorry, I'm having trouble connecting to the server. Please try again later." 
            }
          ]
        };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChatSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      try {
        await axios.delete(`https://ai-backend.bitbrains.fun/chat/session/${sessionId}`);
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }
        await fetchChatSessions();
      } catch (error) {
        console.error('Error deleting chat session:', error);
        alert('Failed to delete chat session');
      }
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Format the date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-[calc(100vh-136px)]">
      {/* Mobile sidebar toggle */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-20 left-4 z-30 bg-blue-600 text-white rounded-full p-2 shadow-lg"
      >
        <ChevronRightIcon className={`h-5 w-5 transition-transform duration-300 ${showSidebar ? 'rotate-180' : ''}`} />
      </button>

      {/* Sidebar */}
      <div 
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 fixed md:static z-20 w-72 h-full bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-md overflow-hidden flex flex-col`}
      >
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <button
            onClick={startNewChatSession}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] mb-4"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Chat</span>
          </button>
          
          <h3 className="font-medium text-gray-700 mb-2">Your Conversations</h3>
          
          <div className="overflow-y-auto flex-1 pr-1 space-y-1.5">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-500 p-4">
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to begin</p>
              </div>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.id} 
                  onClick={() => loadChatSession(session.id)}
                  className="flex items-center group"
                >
                  <div 
                    className={`flex-1 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm ${
                      currentSession?.id === session.id ? 'bg-white shadow-sm' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-800 truncate">{session.title}</div>
                    <div className="text-xs text-gray-500">{formatDate(session.created_at)}</div>
                  </div>
                  <button
                    onClick={(e) => deleteChatSession(session.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">{currentSession.title}</h2>
              <p className="text-xs text-gray-500">
                {currentSession.messages.length} message{currentSession.messages.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesRef}
              className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white"
            >
              {currentSession.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Start a New Conversation</h3>
                  <p className="text-gray-600 max-w-md">
                    Ask any question about your documents, math concepts, or educational topics
                  </p>
                </div>
              ) : (
                currentSession.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`message mb-4 max-w-3xl ${
                      message.role === 'user' ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <MarkdownWithMath isUserMessage={message.role === 'user'}>
                        {message.content}
                      </MarkdownWithMath>
                    </div>
                    <div 
                      className={`text-xs mt-1 text-gray-500 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {message.role === 'user' ? 'You' : 'Assistant'} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleChatSubmit} className="relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="w-full p-4 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your message..."
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`absolute right-2 top-2 p-2 rounded-lg transition-all duration-200 ${
                    isLoading 
                      ? 'bg-gray-200 text-gray-400' 
                      : inputMessage.trim() 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-md' 
                        : 'bg-gray-200 text-gray-400'
                  }`}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? (
                    <ArrowPathIcon className="h-6 w-6 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-6 w-6" />
                  )}
                </button>
              </form>
              <p className="text-xs text-center text-gray-500 mt-2">
                Responses are AI-generated and may not always be accurate
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chat</h2>
            <p className="text-gray-600 max-w-md mb-8">
              Start a new chat to discuss your educational topics or ask questions about your documents
            </p>
            <button
              onClick={startNewChatSession}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-105"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Start a New Chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage; 
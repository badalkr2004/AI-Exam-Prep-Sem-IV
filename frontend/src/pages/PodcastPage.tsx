import { useState, useEffect } from 'react';
import axios from 'axios';
import PodcastPlayer from '../components/PodcastPlayer';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import { ArrowRightIcon, MicrophoneIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

// Define API URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PodcastData {
  id: string;
  title: string;
  subject: string;
  transcript: string;
  audio_path?: string;
  duration_seconds?: number;
  created_at: string;
}

const PodcastPage = () => {
  const [podcasts, setPodcasts] = useState<PodcastData[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [duration, setDuration] = useState<number>(10);
  const [audioBlob, setAudioBlob] = useState<string | null>(null);

  useEffect(() => {
    fetchPodcasts();
  }, []);

  // Fetch podcast audio data when a podcast with audio_path is selected
  useEffect(() => {
    if (selectedPodcast?.audio_path) {
      fetchPodcastAudio(selectedPodcast.audio_path);
    } else {
      setAudioBlob(null);
    }
  }, [selectedPodcast]);

  const fetchPodcasts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/podcasts`);
      console.log(response);
      console.log("Podcasts response:", response.data);
      setPodcasts(response.data || []);
    } catch (error) {
      console.error('Error fetching podcasts:', error);
      setPodcasts([]);
    }
  };

  // Fetch audio file and convert to blob URL
  const fetchPodcastAudio = async (audioPath: string) => {
    try {
      // Show loading state while fetching audio
      setIsLoading(true);
      
      // Make a request to get the audio file
      const response = await axios.get(`${API_BASE_URL}${audioPath}`, {
        responseType: 'blob'
      });
      
      // Create a blob URL from the response
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      
      setAudioBlob(blobUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching audio file:', error);
      setAudioBlob(null);
      setIsLoading(false);
    }
  };

  const generatePodcast = async () => {
    if (!subject) {
      alert('Please enter a subject');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/podcast/generate`, {
        subject,
        topic: topic || undefined,
        duration_minutes: duration
      });
      console.log("Generated podcast:", response.data);
      setPodcasts(prev => [...prev, response.data]);
      setSelectedPodcast(response.data);
      setSubject('');
      setTopic('');
    } catch (error) {
      console.error('Error generating podcast:', error);
      alert('Failed to generate podcast. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-80 bg-white rounded-2xl shadow-lg p-6 h-fit">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Podcast</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Biology, History"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Specific topic or concept"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min="5"
                    max="30"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={generatePodcast}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <MicrophoneIcon className="h-5 w-5" />
                      <span>Generate Podcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MusicalNoteIcon className="h-5 w-5 mr-2 text-purple-600" />
                Saved Podcasts
              </h3>
              <div className="space-y-2">
                {podcasts.map(podcast => (
                  <button
                    key={podcast.id}
                    onClick={() => setSelectedPodcast(podcast)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedPodcast?.id === podcast.id
                        ? 'bg-purple-100 text-purple-900'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{podcast.title}</div>
                    <div className="text-sm text-gray-500">{podcast.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedPodcast ? (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedPodcast.title}</h2>
                  <div className="flex items-center text-gray-500">
                    <MicrophoneIcon className="h-5 w-5 mr-2" />
                    <span>{selectedPodcast.subject}</span>
                  </div>
                </div>
                
                {selectedPodcast.audio_path ? (
                  <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                    {audioBlob ? (
                      <PodcastPlayer
                        title={selectedPodcast.title}
                        subject={selectedPodcast.subject}
                        transcript={selectedPodcast.transcript}
                        audioUrl={audioBlob}
                        durationSeconds={selectedPodcast.duration_seconds}
                      />
                    ) : isLoading ? (
                      <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                        <p className="text-purple-700 font-medium">Loading audio file...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64">
                        <div className="text-red-500 mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium">Failed to load audio</p>
                        <button 
                          onClick={() => fetchPodcastAudio(selectedPodcast.audio_path!)}
                          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 flex flex-col items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-purple-700 font-medium">Generating audio with ElevenLabs AI...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a minute or two</p>
                  </div>
                ) : null}

                <div className="prose max-w-none prose-purple">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <ArrowRightIcon className="h-6 w-6 mr-2 text-purple-600" />
                    Transcript
                  </h3>
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeMathjax]}
                  >
                    {selectedPodcast.transcript}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <MicrophoneIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No Podcast Selected</h3>
                  <p className="mt-1 text-gray-500">Select or generate a podcast to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastPage; 
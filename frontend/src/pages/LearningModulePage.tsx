import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import { ArrowRightIcon, BookOpenIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface LearningModuleData {
  id: string;
  title: string;
  subject: string;
  content: string;
  related_questions: string[];
  created_at: string;
}

const LearningModulePage = () => {
  const [modules, setModules] = useState<LearningModuleData[]>([]);
  const [selectedModule, setSelectedModule] = useState<LearningModuleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');

  useEffect(() => {
    fetchLearningModules();
  }, []);

  const fetchLearningModules = async () => {
    try {
      const response = await axios.get('https://ai-backend.bitbrains.fun/analyses');
      console.log("Learning modules response:", response.data);
      setModules(response.data || []);
    } catch (error) {
      console.error('Error fetching learning modules:', error);
      setModules([]);
    }
  };

  const generateLearningModule = async () => {
    if (!subject) {
      alert('Please enter a subject');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('https://ai-backend.bitbrains.fun/analysis/generate', {
        subject,
        topic: topic || undefined
      });
      console.log("Generated learning module:", response.data);
      setModules(prev => [...prev, response.data]);
      setSelectedModule(response.data);
      setSubject('');
      setTopic('');
    } catch (error) {
      console.error('Error generating learning module:', error);
      alert('Failed to generate learning module. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-80 lg:sticky lg:top-20 bg-white rounded-2xl shadow-lg p-6 h-fit">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Module</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Physics, Mathematics"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Specific topic or concept"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={generateLearningModule}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
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
                      <AcademicCapIcon className="h-5 w-5" />
                      <span>Generate Module</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Saved Modules
              </h3>
              <div className="space-y-2">
                {modules.map(module => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedModule?.id === module.id
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{module.title}</div>
                    <div className="text-sm text-gray-500">{module.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedModule ? (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedModule.title}</h2>
                  <div className="flex items-center text-gray-500">
                    <AcademicCapIcon className="h-5 w-5 mr-2" />
                    <span>{selectedModule.subject}</span>
                  </div>
                </div>
                
                <div className="prose max-w-none prose-indigo">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeMathjax]}
                  >
                    {selectedModule.content}
                  </ReactMarkdown>
                </div>

                {selectedModule.related_questions && selectedModule.related_questions.length > 0 && (
                  <div className="mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <ArrowRightIcon className="h-6 w-6 mr-2 text-indigo-600" />
                      Related Questions
                    </h3>
                    <div className="space-y-4">
                      {selectedModule.related_questions.map((question, index) => (
                        <div
                          key={index}
                          className="p-4 bg-indigo-50 rounded-lg border border-indigo-100"
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                              {index + 1}
                            </div>
                            <div className="ml-3">
                              <p className="text-gray-900">{question}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No Module Selected</h3>
                  <p className="mt-1 text-gray-500">Select or generate a learning module to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningModulePage; 
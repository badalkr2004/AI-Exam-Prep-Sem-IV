import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { DocumentArrowUpIcon, DocumentTextIcon, SpeakerWaveIcon, PauseIcon } from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeMathjax from 'rehype-mathjax'

type InputType = 'pdf' | 'text';
type SummaryType = 'summarize' | 'elaborate' | 'learn';

function App() {
  const [inputType, setInputType] = useState<InputType>('pdf')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState<string>('')
  const [summaryType, setSummaryType] = useState<SummaryType>('summarize')
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  
  // Store speech synthesis objects
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Plain text version of the result (without markdown)
  const getPlainTextResult = () => {
    // Strip markdown syntax for better text-to-speech
    return result
      .replace(/\$\$(.*?)\$\$/g, '') // Remove block math formulas
      .replace(/\$(.*?)\$/g, '') // Remove inline math formulas
      .replace(/#+\s/g, '') // Remove markdown headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // Convert bold to plain text
      .replace(/\*(.*?)\*/g, '$1') // Convert italic to plain text
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Convert links to just the text
      .replace(/```.*?```/gs, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1'); // Remove inline code
  };

  // Initialize speech synthesis
  const initSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  };

  // Handle text-to-speech playback
  const handleSpeak = () => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  // Get the action button text based on the summary type
  const getActionButtonText = () => {
    if (loading) return 'Processing...';
    
    switch (summaryType) {
      case 'summarize': return 'Generate Summary';
      case 'elaborate': return 'Elaborate Content';
      case 'learn': return 'Create Learning Materials';
      default: return 'Generate Summary';
    }
  };

  // Get the descriptive text for the current mode
  const getModeDescription = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputType === 'pdf' && !file) {
      setError('Please select a PDF file')
      return
    }

    if (inputType === 'text' && !text.trim()) {
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

        response = await axios.post('http://localhost:8000/summarize', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        response = await axios.post('http://localhost:8000/summarize-text', {
          text: text,
          summary_type: summaryType
        });
      }
      
      setResult(response.data.result)
    } catch (err) {
      setError(`Error processing the ${inputType === 'pdf' ? 'PDF' : 'text'}. Please try again.`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Initialize speech synthesis on component mount
  useEffect(() => {
    initSpeechSynthesis();
    
    // Cleanup on unmount
    return () => {
      if (speechSynthesisRef.current && isSpeaking) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Content Summarizer & Learning Tool
          </h1>
          
          <div className="mb-6">
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setInputType('pdf')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  inputType === 'pdf' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                PDF Upload
              </button>
              <button
                type="button"
                onClick={() => setInputType('text')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  inputType === 'text' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Text Input
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {inputType === 'pdf' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                  </div>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Text
                </label>
                <div className="mt-1">
                  <textarea
                    rows={8}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                    placeholder="Enter the text you want to process here..."
                    value={text}
                    onChange={handleTextChange}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Mode
              </label>
              <select
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value as SummaryType)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="summarize">Summarize</option>
                <option value="elaborate">Elaborate</option>
                <option value="learn">Learn (Educational)</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">{getModeDescription()}</p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || (inputType === 'pdf' && !file) || (inputType === 'text' && !text.trim())}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || (inputType === 'pdf' && !file) || (inputType === 'text' && !text.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {getActionButtonText()}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Result</h2>
                <button
                  type="button"
                  onClick={handleSpeak}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSpeaking ? (
                    <>
                      <PauseIcon className="h-5 w-5 mr-1" />
                      Stop Audio
                    </>
                  ) : (
                    <>
                      <SpeakerWaveIcon className="h-5 w-5 mr-1" />
                      Play Audio
                    </>
                  )}
                </button>
              </div>
              <div className="prose max-w-none bg-gray-50 p-4 rounded-md overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeMathjax]}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

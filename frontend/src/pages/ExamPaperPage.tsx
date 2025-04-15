import { useState, useEffect } from 'react';
import axios from 'axios';
import ExamPaperUploader from '../components/ExamPaperUploader';
import { 
  DocumentArrowUpIcon, 
  DocumentMagnifyingGlassIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  CalendarIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  year?: string;
  file_path: string;
  uploaded_at: string;
  metadata: Record<string, unknown>;
}

const ExamPaperPage = () => {
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [filteredPapers, setFilteredPapers] = useState<ExamPaper[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    fetchExamPapers();
  }, []);

  useEffect(() => {
    // Extract unique subjects
    const subjectList = Array.from(new Set(examPapers.map(paper => paper.subject)));
    setSubjects(subjectList);

    // Filter papers based on search term and selected subject
    let filtered = [...examPapers];
    
    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }
    
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(paper => 
        paper.title.toLowerCase().includes(lowercasedSearch) ||
        paper.subject.toLowerCase().includes(lowercasedSearch) ||
        (paper.year && paper.year.toLowerCase().includes(lowercasedSearch))
      );
    }
    
    setFilteredPapers(filtered);
  }, [examPapers, searchTerm, selectedSubject]);

  const fetchExamPapers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8000/exam/papers');
      console.log("Exam papers response:", response.data);
      setExamPapers(response.data?.papers || []);
    } catch (error) {
      console.error('Error fetching exam papers:', error);
      setExamPapers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = async () => {
    await fetchExamPapers();
    setIsUploaderOpen(false);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex h-[calc(100vh-136px)]">
      {/* Mobile sidebar toggle */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-20 left-4 z-30 bg-green-600 text-white rounded-full p-2 shadow-lg"
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
            onClick={() => setIsUploaderOpen(!isUploaderOpen)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white p-3 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] mb-6"
          >
            <DocumentArrowUpIcon className="h-5 w-5" />
            <span>{isUploaderOpen ? 'Hide Uploader' : 'Upload Exam Paper'}</span>
            <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform duration-300 ${isUploaderOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isUploaderOpen && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm animate-fade-in">
              <ExamPaperUploader onUploadComplete={handleUploadComplete} />
            </div>
          )}

          <div className="mb-4">
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Search papers..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <h2 className="font-bold text-gray-900 mb-3">Your Exam Papers</h2>
            <div className="overflow-y-auto pr-1 space-y-2 max-h-[calc(100vh-420px)]">
              {filteredPapers.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  {isLoading ? (
                    <p>Loading exam papers...</p>
                  ) : (
                    <>
                      <DocumentMagnifyingGlassIcon className="h-10 w-10 mx-auto mb-2" />
                      <p>{examPapers.length === 0 ? 'No exam papers uploaded yet' : 'No matching papers found'}</p>
                    </>
                  )}
                </div>
              ) : (
                filteredPapers.map(paper => (
                  <div
                    key={paper.id}
                    onClick={() => setSelectedPaper(paper)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm ${
                      selectedPaper?.id === paper.id ? 'bg-white shadow-sm border-l-4 border-green-500' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="font-medium text-gray-800 truncate">{paper.title}</div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                      <span className="flex items-center">
                        <BookOpenIcon className="h-3 w-3 mr-1" />
                        {paper.subject}
                      </span>
                      {paper.year && (
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {paper.year}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
        {selectedPaper ? (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedPaper.title}</h1>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm flex items-center">
                    <BookOpenIcon className="h-4 w-4 mr-1" />
                    {selectedPaper.subject}
                  </div>
                  {selectedPaper.year && (
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {selectedPaper.year}
                    </div>
                  )}
                  <div className="text-gray-500 text-sm flex items-center">
                    Uploaded: {formatDate(selectedPaper.uploaded_at)}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Description</h2>
                  <p className="text-gray-600">
                    This is an exam paper for {selectedPaper.subject}
                    {selectedPaper.year ? ` from the year ${selectedPaper.year}` : ''}.
                    You can view and download the PDF using the link below.
                  </p>
                </div>
                
                <a
                  href={`http://localhost:8000${selectedPaper.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-105"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  View PDF
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <DocumentArrowUpIcon className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Exam Papers Repository</h2>
            <p className="text-gray-600 max-w-md mb-8">
              Upload and manage your exam papers. Use them for study, revision, or reference.
            </p>
            <button
              onClick={() => {
                setIsUploaderOpen(true);
                setShowSidebar(true);
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg shadow-md transform transition-transform duration-200 hover:scale-105"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
              <span>Upload Your First Exam Paper</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamPaperPage; 
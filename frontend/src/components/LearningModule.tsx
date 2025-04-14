import React, { useState } from 'react';
import { MarkdownWithMath } from '../utils/MarkdownWithMath';
import { BookOpenIcon, DocumentTextIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface LearningModuleProps {
  title: string;
  subject: string;
  content: string;
  relatedQuestions: string[];
}

const LearningModule: React.FC<LearningModuleProps> = ({
  title,
  subject,
  content,
  relatedQuestions
}) => {
  // State for the active section tab
  const [activeTab, setActiveTab] = useState('content');
  
  // Process content to ensure it's valid markdown
  const processedContent = content || '# No content available';
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-indigo-100 mt-1">{subject}</p>
      </div>
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'content'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpenIcon className="h-5 w-5 mr-2" />
            Learning Content
          </button>
          {relatedQuestions.length > 0 && (
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'questions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Related Questions
            </button>
          )}
        </nav>
      </div>
      
      {/* Content */}
      <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {activeTab === 'content' ? (
          <div className="prose max-w-none">
            <MarkdownWithMath>{processedContent}</MarkdownWithMath>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Related Exam Questions</h3>
            <p className="text-sm text-gray-500">
              These questions have been extracted from previous exam papers and are relevant to this learning module.
              Practicing these will help you prepare for similar questions in your exams.
            </p>
            
            <div className="space-y-4">
              {relatedQuestions && relatedQuestions.length > 0 ? (
                relatedQuestions.map((question, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Question {index + 1}</h4>
                    <div className="prose prose-sm">
                      <MarkdownWithMath>{question}</MarkdownWithMath>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No related questions available for this module.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Created with AI-powered analysis
        </div>
        <button 
          onClick={() => window.print()}
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Print Module
          <ChevronRightIcon className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default LearningModule; 
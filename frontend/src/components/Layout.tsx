import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  DocumentArrowUpIcon, 
  ChatBubbleLeftRightIcon, 
  AcademicCapIcon,
  BookOpenIcon,
  MusicalNoteIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Navigation items
  const navItems = [
    { 
      path: '/chat', 
      name: 'Chat', 
      icon: ChatBubbleLeftRightIcon,
      gradient: 'from-blue-500 to-indigo-600'
    },
    { 
      path: '/mindmap', 
      name: 'Mind Map', 
      icon: AcademicCapIcon,
      gradient: 'from-purple-600 to-indigo-600'
    },
    { 
      path: '/learning', 
      name: 'Learning', 
      icon: BookOpenIcon,
      gradient: 'from-pink-500 to-purple-600'
    },
    { 
      path: '/podcast', 
      name: 'Podcast', 
      icon: MusicalNoteIcon,
      gradient: 'from-orange-400 to-pink-500'
    },
    { 
      path: '/exam', 
      name: 'Exam Papers', 
      icon: DocumentArrowUpIcon,
      gradient: 'from-green-500 to-teal-400'
    }
  ];

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when navigation happens
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link 
                to="/" 
                className="flex-shrink-0 flex items-center"
              >
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EXAMprep.
                </span>
              </Link>
              
              {/* Desktop nav */}
              <div className="hidden md:ml-8 md:flex md:space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        isActive 
                          ? `bg-gradient-to-r ${item.gradient} text-white` 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon 
                        className={`h-5 w-5 mr-1.5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-gray-500'
                        }`} 
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="pt-2 pb-3 space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      isActive 
                        ? `bg-gradient-to-r ${item.gradient} text-white` 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon 
                      className={`h-6 w-6 mr-2 ${isActive ? 'text-white' : 'text-gray-500'}`} 
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© {new Date().getFullYear()} PDF Summarizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/landing-page';
import ChatPage from './pages/ChatPage';
import MindMapPage from './pages/MindMapPage';
import LearningModulePage from './pages/LearningModulePage';
import PodcastPage from './pages/PodcastPage';
import ExamPaperPage from './pages/ExamPaperPage';
import Layout from './components/Layout';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/chat" element={<Layout><ChatPage /></Layout>} />
        <Route path="/mindmap" element={<Layout><MindMapPage /></Layout>} />
        <Route path="/learning" element={<Layout><LearningModulePage /></Layout>} />
        <Route path="/podcast" element={<Layout><PodcastPage /></Layout>} />
        <Route path="/exam" element={<Layout><ExamPaperPage /></Layout>} />
      </Routes>
    </Router>
  );
};

export default App;
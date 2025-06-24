import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MindmapEditor from './pages/MindmapEditor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mindmap/:pageId" element={<MindmapEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
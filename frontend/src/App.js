import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './components/LoginPage';
import LCARSLayout from './components/LCARSLayout';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import ComputerChat from './components/ComputerChat';
import ArticleEditor from './components/ArticleEditor';

function AppContent() {
  const { user, token, checkAuth } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState({});
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (token && !user) {
      checkAuth().finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, [token, user, checkAuth]);

  const navigate = (p, params = {}) => {
    setPage(p);
    setPageParams(params);
  };

  if (!authChecked) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-lcars-orange font-lcars tracking-[0.3em] text-2xl animate-pulse">
          SYSTEME WERDEN INITIALISIERT...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'knowledge':
        return <KnowledgeBase onNavigate={navigate} initialCategory={pageParams.category} />;
      case 'article':
        return <KnowledgeBase onNavigate={navigate} />;
      case 'chat':
        return <ComputerChat />;
      case 'create':
        return <ArticleEditor onNavigate={navigate} editArticleId={pageParams.editId} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <LCARSLayout activePage={page} onNavigate={navigate}>
      {renderPage()}
    </LCARSLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

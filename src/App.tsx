
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Home from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add more routes as needed */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

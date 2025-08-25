import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PersonaLibrary } from './pages/PersonaLibrary';
import { SimulationHub } from './pages/SimulationHub';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="personas" element={<PersonaLibrary />} />
          <Route path="simulation" element={<SimulationHub />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
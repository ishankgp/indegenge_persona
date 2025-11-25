import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import { PersonaLibrary } from './pages/PersonaLibrary';
import BrandLibrary from './pages/BrandLibrary';
import { CreatePersona } from './pages/CreatePersona';
import { SimulationHub } from './pages/SimulationHub';
import { AnalyticsEnhanced } from './pages/AnalyticsEnhanced';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="personas" element={<PersonaLibrary />} />
          <Route path="brand-library" element={<BrandLibrary />} />
          <Route path="create-persona" element={<CreatePersona />} />
          <Route path="simulation" element={<SimulationHub />} />
          <Route path="analytics" element={<AnalyticsEnhanced />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

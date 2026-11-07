import { Route, Routes } from 'react-router';
import AppShell from './AppShell.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}

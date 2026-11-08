import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './AppShell';
import HomePage from '@/features/home/HomePage';
import TasksPage from '@/features/tasks/TasksPage';
import ArchivePage from '@/features/archive/ArchivePage';
import SettingsPage from '@/features/settings/SettingsPage';
import LoginPage from '@/features/auth/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

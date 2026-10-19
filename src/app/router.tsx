import { createHashRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { HomePage } from '../features/home/HomePage'
import { ItemsPage } from '../features/items/ItemsPage'
import { ItemDetalhePage } from '../features/items/ItemDetalhePage'
import { CalendarioPage } from '../features/calendario/CalendarioPage'
import { AboutPage } from '../features/about/AboutPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { ContaPage } from '../features/conta/ContaPage'
import { RedefinirSenhaPage } from '../features/conta/RedefinirSenhaPage'
import { TermosPage } from '../features/termos/TermosPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'itens', element: <ItemsPage /> },
      { path: 'itens/:id', element: <ItemDetalhePage /> },
      { path: 'calendario', element: <CalendarioPage /> },
      { path: 'conta', element: <ContaPage /> },
      { path: 'redefinir-senha', element: <RedefinirSenhaPage /> },
      { path: 'sobre', element: <AboutPage /> },
      { path: 'termos', element: <TermosPage /> },
      { path: 'config', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

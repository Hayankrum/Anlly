'use client'

import { useSyncExternalStore } from 'react'
import TermosModal from './TermosModal'

interface TermosCheckerProps {
  children: React.ReactNode
  usuario: {
    id: number
    aceitouTermos?: boolean
  } | null
}

function subscribeNoop() {
  return () => {}
}

function getMountedSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export default function TermosChecker({ children, usuario }: TermosCheckerProps) {
  const mounted = useSyncExternalStore(subscribeNoop, getMountedSnapshot, getServerSnapshot)

  const precisaAceitar = mounted && usuario && !usuario.aceitouTermos

  return (
    <>
      <TermosModal isOpen={!!precisaAceitar} />
      {precisaAceitar ? null : <>{children}</>}
    </>
  )
}
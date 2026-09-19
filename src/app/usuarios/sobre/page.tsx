'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import InstallPWAButton from '@/components/InstallPWAButton'
import TermosModal from '@/components/TermosModal'

function ShareSection() {
  const [shareData, setShareData] = useState({ url: '', qrSvg: '' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const origin = window.location.origin
    QRCode.toString(origin, { type: 'svg', margin: 2, width: 150 }, (err, svg) => {
      setShareData({ url: origin, qrSvg: err ? '' : svg })
    })
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu App',
          text: 'Confira o Meu App!',
          url: shareData.url,
        })
      } catch {
        // usuário cancelou
      }
    } else {
      handleCopy()
    }
  }

  if (!shareData.url) return null

  return (
    <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Compartilhar</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Compartilhe o aplicativo com amigos e colegas.
      </p>

      <div className="flex flex-col items-center gap-4">
        {/* QR Code */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'white' }}
          dangerouslySetInnerHTML={{ __html: shareData.qrSvg }}
        />

        {/* URL */}
        <div className="w-full">
          <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Link do aplicativo:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareData.url}
              className="flex-1 px-3 py-2 rounded-md text-xs border truncate"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[44px]"
              style={{
                backgroundColor: copied ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)',
                color: copied ? 'var(--btn-primary-text)' : 'var(--text-primary)',
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Botão Compartilhar */}
        <button
          onClick={handleShare}
          className="w-full font-medium rounded-lg px-6 py-3 text-sm transition-colors min-h-[44px] flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
        >
          <span>📤</span>
          <span>Compartilhar</span>
        </button>
      </div>
    </section>
  )
}

interface UserInfo {
  id: number
}

export default function SobrePage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [termosAbertos, setTermosAbertos] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.id) setUser(data)
      })
      .catch(() => {})
  }, [])

  return (
    <div>
      <Link
        href={user ? `/usuarios/${user.id}` : '/'}
        className="text-sm transition-colors mb-6 inline-block hover:underline"
        style={{ color: 'var(--text-tertiary)' }}
      >
        ← Voltar ao perfil
      </Link>

      <h1 className="text-2xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Sobre o aplicativo</h1>

      <div className="flex flex-col gap-6">
        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Meu App</h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Uma agenda pessoal para organizar eventos, com suporte offline,
            notificações push e mapa interativo.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Versão 0.1.0</span>
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Funcionalidades</h2>
          <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-center gap-2">
              <span>📝</span>
              <span>Criação e gerenciamento de eventos</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🗺️</span>
              <span>Mapa interativo com Leaflet</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🔔</span>
              <span>Notificações push em tempo real</span>
            </li>
            <li className="flex items-center gap-2">
              <span>📴</span>
              <span>Suporte offline completo</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🌙</span>
              <span>Tema claro e escuro</span>
            </li>
            <li className="flex items-center gap-2">
              <span>📱</span>
              <span>PWA - instalável em qualquer dispositivo</span>
            </li>
          </ul>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Instalar aplicativo</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Instale o aplicativo na sua tela inicial para acesso rápido e melhor experiência offline.
          </p>
          <InstallPWAButton />
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Tecnologias</h2>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Leaflet'].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-md text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Como instalar</h2>
          <div className="text-sm space-y-3" style={{ color: 'var(--text-secondary)' }}>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Chrome / Edge</p>
              <p className="text-xs">Clique no ícone de instalar que aparece na barra de endereço do navegador.</p>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Firefox</p>
              <p className="text-xs">Clique nos 3 pontos do menu → &quot;Instalar&quot;.</p>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Safari (iOS)</p>
              <p className="text-xs">Toque no botão &quot;Compartilhar&quot; → &quot;Adicionar à Tela de Início&quot;.</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Termo de Compromisso e Responsabilidade</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Consulte a qualquer momento o termo, o compromisso e as regras de uso da plataforma.
          </p>
          <button
            onClick={() => setTermosAbertos(true)}
            className="w-full font-medium rounded-lg px-6 py-3 text-sm transition-colors min-h-[44px]"
            style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
          >
            Ver Termo de Compromisso e Responsabilidade
          </button>
        </section>

        <ShareSection />
      </div>

      <TermosModal isOpen={termosAbertos} onClose={() => setTermosAbertos(false)} readonly />
    </div>
  )
}

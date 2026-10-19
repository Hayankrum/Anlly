import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '../../shared/ui/Button'

export function ShareSection() {
  const [url, setUrl] = useState('')
  const [qrSvg, setQrSvg] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const completa = window.location.origin + import.meta.env.BASE_URL
    setUrl(completa)
    let ativo = true
    QRCode.toString(completa, { type: 'svg', margin: 2, width: 160 })
      .then((svg) => {
        if (ativo) setQrSvg(svg)
      })
      .catch(() => {
        if (ativo) setQrSvg('')
      })
    return () => {
      ativo = false
    }
  }, [])

  async function copiar(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }

  async function aoCopiar() {
    const ok = await copiar()
    if (!ok) return
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 2000)
  }

  async function aoCompartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Anlly',
          text: 'Confira o Anlly — organize seu dia a dia, funciona 100% offline!',
          url,
        })
        return
      } catch {
        // compartilhamento cancelado pelo usuário
      }
    }
    const ok = await copiar()
    if (ok) {
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (!url) return null

  return (
    <section className="cartao" aria-labelledby="titulo-compartilhar">
      <h2 className="cartao-titulo" id="titulo-compartilhar">
        Compartilhar
      </h2>
      <p className="sobre-texto">
        Escaneie o QR code para abrir o app em outro aparelho. Quem abrir baixa tudo uma única vez
        e passa a usá-lo offline.
      </p>

      <div className="compartilhar">
        {qrSvg ? (
          <div
            className="compartilhar-qr"
            role="img"
            aria-label="QR code com o link do aplicativo"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}

        <div className="compartilhar-link">
          <p className="compartilhar-rotulo">Link do aplicativo:</p>
          <div className="compartilhar-linha">
            <input
              className="compartilhar-input"
              type="text"
              readOnly
              value={url}
              aria-label="Link do aplicativo"
              onFocus={(evento) => evento.target.select()}
            />
            <Button
              variante="secundario"
              tamanho="icone"
              aria-label={copiado ? 'Link copiado' : 'Copiar link'}
              title={copiado ? 'Copiado' : 'Copiar link'}
              onClick={() => void aoCopiar()}
            >
              {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            </Button>
          </div>

          <Button className="compartilhar-botao" onClick={() => void aoCompartilhar()}>
            <Share2 size={18} aria-hidden="true" />
            {copiado ? 'Link copiado' : 'Compartilhar'}
          </Button>
        </div>
      </div>
    </section>
  )
}

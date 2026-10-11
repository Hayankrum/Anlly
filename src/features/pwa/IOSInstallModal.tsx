import { Share, PlusCircle } from 'lucide-react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { useInstallModal, useInstallPrompt } from './useInstallPrompt'

export function IOSInstallModal() {
  const { aberto } = useInstallModal()
  const { dismiss } = useInstallPrompt()

  return (
    <Modal
      aberto={aberto}
      titulo="Instalar no iPhone ou iPad"
      onFechar={dismiss}
      largura="estreito"
      rodape={
        <Button onClick={dismiss} block>
          Entendi
        </Button>
      }
    >
      <p className="modal-texto">
        Abra o app pelo <strong>Safari</strong> e siga os passos:
      </p>
      <ol className="ios-passos">
        <li>
          Toque em <Share size={16} aria-hidden="true" /> <strong>Compartilhar</strong>
        </li>
        <li>
          Escolha <strong>Adicionar à Tela de Início</strong>
        </li>
        <li>
          Toque em <PlusCircle size={16} aria-hidden="true" /> <strong>Adicionar</strong>
        </li>
      </ol>
      <p className="ios-nota">
        Depois disso o app abre sozinho e funciona sem internet. No iPhone, instalar na tela de
        início também protege melhor seus dados: o iOS guarda o app instalado com mais cuidado e é
        bem menos provável que apague o que ainda não foi sincronizado.
      </p>
    </Modal>
  )
}

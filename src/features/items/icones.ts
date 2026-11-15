import {
  BookOpen,
  Briefcase,
  Check,
  Columns3,
  Dumbbell,
  Heart,
  HeartPulse,
  House,
  ListChecks,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Timer,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  ICONE_POR_TIPO,
  type IconeItem,
  type TipoItem,
} from '@shared/schemas/item'

export interface OpcaoIcone {
  id: IconeItem
  rotulo: string
  icone: LucideIcon
}

/** Ícones disponíveis no formulário, na ordem em que aparecem. */
export const ICONES_DISPONIVEIS: OpcaoIcone[] = [
  { id: 'check', rotulo: 'Check', icone: Check },
  { id: 'lista', rotulo: 'Lista', icone: ListChecks },
  { id: 'relogio', rotulo: 'Relógio', icone: Timer },
  { id: 'quadro', rotulo: 'Quadro', icone: Columns3 },
  { id: 'estrela', rotulo: 'Estrela', icone: Star },
  { id: 'coracao', rotulo: 'Coração', icone: Heart },
  { id: 'casa', rotulo: 'Casa', icone: House },
  { id: 'trabalho', rotulo: 'Trabalho', icone: Briefcase },
  { id: 'estudo', rotulo: 'Estudo', icone: BookOpen },
  { id: 'saude', rotulo: 'Saúde', icone: HeartPulse },
  { id: 'compras', rotulo: 'Compras', icone: ShoppingCart },
  { id: 'dinheiro', rotulo: 'Dinheiro', icone: Wallet },
  { id: 'treino', rotulo: 'Treino', icone: Dumbbell },
  { id: 'viagem', rotulo: 'Viagem', icone: Plane },
  { id: 'comida', rotulo: 'Comida', icone: Utensils },
  { id: 'musica', rotulo: 'Música', icone: Music },
]

const POR_ID = new Map(ICONES_DISPONIVEIS.map((opcao) => [opcao.id, opcao.icone]))

/** Ícone escolhido no item; cai no ícone padrão do tipo quando ausente/inválido. */
export function iconeDoItem(
  icone: IconeItem | undefined,
  tipo: TipoItem | undefined,
): LucideIcon {
  return POR_ID.get(icone ?? ICONE_POR_TIPO[tipo ?? 'padrao']) ?? Check
}

/** Ícone inicial de um item novo/editado no formulário. */
export function iconeInicial(
  icone: IconeItem | undefined,
  tipo: TipoItem | undefined,
): IconeItem {
  return icone ?? ICONE_POR_TIPO[tipo ?? 'padrao']
}

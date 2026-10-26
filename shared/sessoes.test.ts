import { describe, expect, it } from 'vitest'
import { resumirUserAgent } from './sessoes'

describe('resumirUserAgent', () => {
  it('identifica Chrome em Android (celular)', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    )
    expect(r.navegador).toBe('Chrome')
    expect(r.sistema).toBe('Android 14')
    expect(r.tipo).toBe('celular')
  })

  it('identifica Safari em iPhone', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    )
    expect(r.navegador).toBe('Safari')
    expect(r.sistema).toBe('iOS 17.2')
    expect(r.tipo).toBe('celular')
  })

  it('identifica Edge em Windows', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    )
    expect(r.navegador).toBe('Edge')
    expect(r.sistema).toBe('Windows')
    expect(r.tipo).toBe('computador')
  })

  it('identifica Samsung Internet como navegador próprio', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    )
    expect(r.navegador).toBe('Samsung Internet')
    expect(r.tipo).toBe('celular')
  })

  it('trata Android sem "Mobile" como tablet', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    expect(r.tipo).toBe('tablet')
  })

  it('identifica Firefox em macOS', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    )
    expect(r.navegador).toBe('Firefox')
    expect(r.sistema).toBe('macOS 10.15')
    expect(r.tipo).toBe('computador')
  })

  it('identifica iPad como tablet', () => {
    const r = resumirUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    )
    expect(r.tipo).toBe('tablet')
  })

  it('cai no desconhecido com userAgent vazio', () => {
    const r = resumirUserAgent('')
    expect(r.navegador).toBe('Navegador desconhecido')
    expect(r.sistema).toBe('Sistema desconhecido')
    expect(r.tipo).toBe('desconhecido')
  })

  it('aceita null/undefined sem quebrar', () => {
    expect(resumirUserAgent(null).tipo).toBe('desconhecido')
    expect(resumirUserAgent(undefined).tipo).toBe('desconhecido')
  })
})

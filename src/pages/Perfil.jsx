import { useState } from 'react'
import { supabase } from '../supabase.js'
import { onlyDigits, showPhone } from '../lib.js'

// Cadastro (primeiro acesso) e edição do perfil.
export default function Perfil({ me, session, done, toast }) {
  const first = !me
  const [name, setName] = useState(me?.name || '')
  const [phone, setPhone] = useState(me ? showPhone(me.phone) : '')
  const [bairro, setBairro] = useState(me?.bairro || '')
  const [consent, setConsent] = useState(!first)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    const digits = onlyDigits(phone).replace(/^55(?=\d{10,11}$)/, '')
    if (digits.length < 10 || digits.length > 11) return setErr('Informe o celular com DDD, ex.: (11) 98765-4321.')
    setBusy(true)
    setErr('')
    const row = { name: name.trim(), phone: digits, bairro: bairro.trim() || null }
    const { error } = first
      ? await supabase.from('profiles').insert({ id: session.user.id, ...row })
      : await supabase.from('profiles').update(row).eq('id', me.id)
    setBusy(false)
    if (error) return setErr(error.message)
    toast(first ? 'Cadastro feito! Bem-vindo.' : 'Perfil atualizado.')
    done()
  }

  return (
    <main>
      <h1>{first ? 'Seu cadastro' : 'Meu perfil'}</h1>
      <p className="sub">
        {first
          ? 'Só falta isso. Seu celular serve para motoristas e passageiros falarem com você pelo WhatsApp.'
          : session.user.email}
      </p>
      <form onSubmit={submit}>
        <label>Nome<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Celular com DDD (WhatsApp)
          <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>Bairro<input maxLength={80} placeholder="Onde você costuma sair" value={bairro} onChange={(e) => setBairro(e.target.value)} /></label>
        {first && (
          <label className="check">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Autorizo a ONG Sonhar Acordado a guardar meu nome, celular e bairro para organizar caronas. Esses dados
              ficam visíveis apenas para pessoas cadastradas no app e posso pedir para apagá-los quando quiser.
            </span>
          </label>
        )}
        {err && <p className="error">{err}</p>}
        <button className="btn wide" disabled={busy}>{busy ? 'Salvando…' : first ? 'Concluir cadastro' : 'Salvar'}</button>
        {!first && <button type="button" className="btn ghost wide" onClick={done}>Voltar</button>}
      </form>
    </main>
  )
}

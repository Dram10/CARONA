import { useState } from 'react'
import { supabase } from '../supabase.js'

// Entrar ou criar conta com e-mail e senha.
export default function Login({ toast }) {
  const [mode, setMode] = useState('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const fn = mode === 'entrar' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { data, error } = await fn.call(supabase.auth, { email: email.trim(), password })
    setBusy(false)
    if (error) return setErr(traduz(error.message))
    if (mode === 'criar' && !data.session) toast('Conta criada! Confira seu e-mail para confirmar e depois entre.')
  }

  return (
    <main>
      <h1>{mode === 'entrar' ? 'Bem-vindo de volta' : 'Criar sua conta'}</h1>
      <p className="sub">Caronas entre voluntários e participantes da Sonhar Acordado.</p>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Senha
          <input type="password" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} required minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn wide" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
      </form>
      <div className="acts" style={{ justifyContent: 'center', marginTop: 18 }}>
        <button className="btn ghost" onClick={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setErr('') }}>
          {mode === 'entrar' ? 'Primeira vez? Criar conta' : 'Já tenho conta'}
        </button>
      </div>
    </main>
  )
}

function traduz(m) {
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(m)) return 'Este e-mail já tem conta. Use "Já tenho conta".'
  if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar.'
  return m
}

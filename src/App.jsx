import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, configured } from './supabase.js'
import { iso } from './lib.js'
import Login from './pages/Login.jsx'
import Perfil from './pages/Perfil.jsx'
import Caronas from './pages/Caronas.jsx'
import Oferecer from './pages/Oferecer.jsx'
import Pedir from './pages/Pedir.jsx'
import Minhas from './pages/Minhas.jsx'
import Coordenacao from './pages/Coordenacao.jsx'

const ICONS = {
  caronas: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  oferecer: <><path d="M3 15l2-6h14l2 6v4h-3M6 19H3v-4h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="7.5" cy="18" r="2" fill="currentColor" /><circle cx="16.5" cy="18" r="2" fill="currentColor" /></>,
  pedir: <path d="M12 3v10M7 8l5-5 5 5M5 21h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  minhas: <><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  coordenacao: <><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 15v-3M12 15V9M16 15v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
}
const TABS = [
  ['caronas', 'Caronas'],
  ['oferecer', 'Oferecer'],
  ['pedir', 'Pedir'],
  ['minhas', 'Minhas'],
  ['coordenacao', 'Coordenação'],
]
const VALID = new Set([...TABS.map((t) => t[0]), 'perfil'])
const tabFromHash = () => {
  const h = location.hash.slice(1)
  return VALID.has(h) ? h : 'caronas'
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = carregando
  const [me, setMe] = useState(undefined) // perfil da pessoa logada; null = ainda não criou
  const [data, setData] = useState({ rides: [], bookings: [], people: {}, requests: [] })
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState(tabFromHash)
  const [toastMsg, setToastMsg] = useState('')

  // Sessão de login
  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Navegação pelas abas (o endereço guarda a aba, ex.: #minhas)
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])
  const go = (t) => {
    location.hash = t
    setTab(t)
    scrollTo(0, 0)
  }

  const toast = useCallback((m) => {
    setToastMsg(m)
    clearTimeout(toast.t)
    toast.t = setTimeout(() => setToastMsg(''), 3000)
  }, [])

  // Carrega perfil e dados
  const load = useCallback(async () => {
    if (!session) return
    const today = iso(0)
    const [p, r, q] = await Promise.all([
      supabase.from('profiles').select('id,name,phone,bairro,is_coord'),
      supabase.from('rides').select('*').eq('canceled', false).gte('ride_date', today).order('ride_date').order('ride_time'),
      supabase.from('requests').select('*').gte('req_date', today).neq('status', 'cancelado').order('req_date').order('req_time'),
    ])
    const err = p.error || r.error || q.error
    if (err) return setLoadError(err.message)
    const ids = r.data.map((x) => x.id)
    const b = ids.length ? await supabase.from('bookings').select('*').in('ride_id', ids) : { data: [] }
    if (b.error) return setLoadError(b.error.message)
    const people = Object.fromEntries(p.data.map((x) => [x.id, x]))
    setMe(people[session.user.id] || null)
    setData({ rides: r.data, bookings: b.data, people, requests: q.data })
    setLoadError('')
  }, [session])

  useEffect(() => {
    if (!session) return
    load()
    // Atualiza sozinho quando alguém mexe em caronas, reservas ou pedidos
    let timer
    const later = () => { clearTimeout(timer); timer = setTimeout(load, 300) }
    const ch = supabase
      .channel('mudancas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, later)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, later)
      .subscribe()
    const onFocus = () => load()
    addEventListener('focus', onFocus)
    return () => { supabase.removeChannel(ch); removeEventListener('focus', onFocus); clearTimeout(timer) }
  }, [session, load])

  // Caronas com a lista de passageiros já juntada
  const rides = useMemo(
    () => data.rides.map((r) => ({ ...r, pax: data.bookings.filter((b) => b.ride_id === r.id) })),
    [data]
  )

  // Executa uma ação no banco, mostra o resultado e recarrega
  const run = useCallback(async (promise, okMsg) => {
    const { error } = await promise
    if (error) {
      toast('Não deu certo: ' + error.message)
      return false
    }
    if (okMsg) toast(okMsg)
    await load()
    return true
  }, [load, toast])

  if (!configured) return <Shell><NotConfigured /></Shell>
  if (session === undefined) return <Shell><div className="center">Carregando…</div></Shell>
  if (!session) return <Shell toast={toastMsg}><Login toast={toast} /></Shell>
  if (me === undefined) return <Shell><div className="center">{loadError || 'Carregando…'}</div></Shell>
  if (me === null || tab === 'perfil')
    return (
      <Shell onLogout={() => supabase.auth.signOut()} toast={toastMsg}>
        <Perfil me={me} session={session} done={() => { load(); go('caronas') }} toast={toast} />
      </Shell>
    )

  const ctx = { me, rides, people: data.people, requests: data.requests, run, toast, go, load }
  const tabs = me.is_coord ? TABS : TABS.filter((t) => t[0] !== 'coordenacao')
  const Page = { caronas: Caronas, oferecer: Oferecer, pedir: Pedir, minhas: Minhas, coordenacao: me.is_coord ? Coordenacao : Caronas }[tab]

  return (
    <Shell onProfile={() => go('perfil')} toast={toastMsg}>
      <main>
        {loadError && <p className="error">Problema ao carregar: {loadError}</p>}
        <Page {...ctx} />
      </main>
      <nav aria-label="Seções" style={{ '--n': tabs.length }}>
        {tabs.map(([k, l]) => (
          <button key={k} className="tab" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg>
            {l}
          </button>
        ))}
      </nav>
    </Shell>
  )
}

function Shell({ children, onProfile, onLogout, toast }) {
  return (
    <div className="shell">
      <div className="app">
        <header>
          <div className="brand">
            <img src="/icon.svg" alt="" />
            Caronas Sonhar Acordado
          </div>
          {onProfile && <button className="hbtn" onClick={onProfile}>Meu perfil</button>}
          {onLogout && <button className="hbtn" onClick={onLogout}>Sair</button>}
        </header>
        {children}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function NotConfigured() {
  return (
    <main>
      <h1>Quase lá</h1>
      <p className="sub">
        O app ainda não está ligado ao banco de dados. Crie o arquivo <code>.env.local</code> com
        <code> VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, como explica o README.
      </p>
    </main>
  )
}

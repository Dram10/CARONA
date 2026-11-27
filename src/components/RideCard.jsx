import { useState } from 'react'
import { supabase } from '../supabase.js'
import { confirmWindow, dayName, firstName, hhmm, waLink, when } from '../lib.js'

export const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 8.5c0 3.5 2.5 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.3-.5-2.4-1.6-2.9-2.9l1-1-1-2z" fill="currentColor" />
  </svg>
)

export function WaButton({ phone, text, children, onClick }) {
  return (
    <a className="btn wa" href={waLink(phone, text)} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      <WaIcon />
      {children}
    </a>
  )
}

const left = (r) => r.seats - r.pax.length
const DELAYS = [10, 15, 30]

// Situação de cada passageiro, para o motorista e a coordenação
export function paxStatus(r, b) {
  if (b.confirmed_at) return ['confirmou', 'ok']
  if (confirmWindow(r)) return ['não confirmou', '']
  return ['reservou', 'mu']
}

/**
 * Cartão de uma carona.
 * view: 'lista' (aba Caronas), 'passageiro' ou 'motorista' (aba Minhas).
 */
export default function RideCard({ r, view, me, people, run, toast }) {
  const [delayOpen, setDelayOpen] = useState(false)
  const [cancelStep, setCancelStep] = useState(false)
  const driver = people[r.driver_id] || { name: 'Motorista' }
  const mine = r.pax.find((b) => b.passenger_id === me.id)
  const isDriver = r.driver_id === me.id
  const seeList = isDriver || me.is_coord
  const where = `${r.origin} → ${r.destination}`
  const tag = `a carona Sonhar Acordado de ${when(r)} (${where})`

  if (view === 'lista' && mine) view = 'passageiro'

  const join = () =>
    run(supabase.from('bookings').insert({ ride_id: r.id, passenger_id: me.id }), `Vaga reservada com ${firstName(driver.name)}!`)
      .then((ok) => ok && closeMyRequest())
  // Se a pessoa tinha um pedido aberto para o mesmo dia, ele fica como atendido
  const closeMyRequest = () =>
    supabase.from('requests').update({ status: 'atendido', ride_id: r.id })
      .eq('person_id', me.id).eq('req_date', r.ride_date).eq('status', 'aberto')
  const leave = () => run(supabase.from('bookings').delete().eq('id', mine.id), 'Sua vaga foi liberada.')
  const confirm = () =>
    run(supabase.from('bookings').update({ confirmed_at: new Date().toISOString() }).eq('id', mine.id), 'Presença confirmada. Boa atividade!')
  const giveUp = () => run(supabase.from('bookings').delete().eq('id', mine.id), 'Vaga liberada. Avise o motorista pelo WhatsApp, se puder.')
  const setDelay = (m) => run(supabase.from('rides').update({ delay_min: m }).eq('id', r.id), `Atraso de ${m} min registrado. Agora avise cada passageiro.`)
  const clearDelay = () => run(supabase.from('rides').update({ delay_min: null }).eq('id', r.id), 'Aviso de atraso retirado.')
  const cancelRide = () => run(supabase.from('rides').update({ canceled: true }).eq('id', r.id), 'Carona cancelada.')

  // Mensagem do motorista para um passageiro, conforme a situação
  const driverMsg = (b) => {
    const n = firstName(people[b.passenger_id]?.name)
    if (cancelStep) return `Oi, ${n}! Aqui é ${driver.name}. Infelizmente vou precisar cancelar ${tag}. Desculpe! Veja outras caronas no app.`
    if (r.delay_min) return `Oi, ${n}! Aqui é ${driver.name}. ${tag[0].toUpperCase() + tag.slice(1)} vai atrasar uns ${r.delay_min} minutos. Desculpe!`
    if (!b.confirmed_at && confirmWindow(r)) return `Oi, ${n}! Aqui é ${driver.name}, d${tag.slice(1)}. Você confirma que vai? Responda no app, por favor.`
    return `Oi, ${n}! Aqui é ${driver.name}, d${tag.slice(1)}.`
  }

  return (
    <article className="card ride">
      <div className="time">{hhmm(r.ride_time)}</div>
      <div className="route">{r.origin}<i>→</i>{r.destination}</div>
      <div className="meta">
        {view !== 'lista' && dayName(r.ride_date) + ' · '}Motorista: {driver.name}{r.note ? ' · ' + r.note : ''}
      </div>
      <span className="seats">
        {Array.from({ length: r.seats }, (_, i) => <span key={i} className={'seat' + (i < r.pax.length ? ' on' : '')} />)}
        &nbsp;{left(r) ? `${left(r)} ${left(r) > 1 ? 'vagas livres' : 'vaga livre'}` : 'lotada'}
      </span>

      {r.delay_min && <div className="full"><span className="chip late">Motorista avisou atraso de ~{r.delay_min} min</span></div>}

      {seeList && view !== 'motorista' && (
        <div className="meta full">
          Passageiros: {r.pax.length ? r.pax.map((b, i) => {
            const [t, c] = paxStatus(r, b)
            return <span key={b.id}>{i ? ', ' : ''}{people[b.passenger_id]?.name || 'Alguém'} <span className={'st ' + c}>{t}</span></span>
          }) : 'ninguém ainda'}
        </div>
      )}

      {/* ----- Lista geral ----- */}
      {view === 'lista' && (
        <div className="acts full">
          {isDriver ? <span className="chip ok">Você é o motorista</span>
            : <button className="btn" onClick={join} disabled={!left(r)}>{left(r) ? 'Reservar vaga' : 'Carona lotada'}</button>}
        </div>
      )}

      {/* ----- Sou passageiro ----- */}
      {view === 'passageiro' && mine && (
        <>
          {confirmWindow(r) && (mine.confirmed_at
            ? <div className="cbox ok full"><b>Presença confirmada.</b> {firstName(driver.name)} já sabe que você vai.</div>
            : <div className="cbox full">
                <b>Sua carona é {when(r)}. Você vai mesmo?</b>
                <div className="acts">
                  <button className="btn sea" onClick={confirm}>Vou sim</button>
                  <button className="btn ghost" onClick={giveUp}>Não vou mais</button>
                </div>
              </div>)}
          <div className="acts full">
            <WaButton phone={driver.phone} text={`Oi, ${firstName(driver.name)}! Aqui é ${me.name}, d${tag.slice(1)}. Vou atrasar uns minutinhos, pode me esperar?`}>
              Avisar que vou atrasar
            </WaButton>
            <WaButton phone={driver.phone} text={`Oi, ${firstName(driver.name)}! Aqui é ${me.name}, d${tag.slice(1)}.`}>
              Falar com {firstName(driver.name)}
            </WaButton>
            {!confirmWindow(r) && <button className="btn ghost" onClick={leave}>Cancelar minha vaga</button>}
          </div>
        </>
      )}

      {/* ----- Sou o motorista ----- */}
      {view === 'motorista' && (
        <>
          <div className="full">
            {r.pax.length === 0 && <p className="meta">Ninguém reservou ainda.</p>}
            {r.pax.map((b) => {
              const p = people[b.passenger_id] || {}
              const [t, c] = paxStatus(r, b)
              return (
                <div key={b.id} className="acts" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{p.name || 'Alguém'} <span className={'st ' + c}>{t}</span></span>
                  <WaButton phone={p.phone} text={driverMsg(b)}>Avisar</WaButton>
                </div>
              )
            })}
          </div>
          {delayOpen && (
            <div className="cbox full">
              <b>Quanto tempo de atraso?</b> Depois toque em “Avisar” ao lado de cada passageiro.
              <div className="acts">
                {DELAYS.map((m) => <button key={m} className="btn sea" onClick={() => { setDelay(m); setDelayOpen(false) }}>{m} min</button>)}
              </div>
            </div>
          )}
          {cancelStep && (
            <div className="cbox full">
              <b>Cancelar esta carona?</b> {r.pax.length ? 'Avise os passageiros nos botões acima antes de confirmar.' : ''}
              <div className="acts">
                <button className="btn" onClick={cancelRide}>Sim, cancelar</button>
                <button className="btn ghost" onClick={() => setCancelStep(false)}>Não</button>
              </div>
            </div>
          )}
          <div className="acts full">
            {r.delay_min
              ? <button className="btn ghost" onClick={clearDelay}>Tirar aviso de atraso</button>
              : <button className="btn sea" onClick={() => setDelayOpen(!delayOpen)}>Vou atrasar</button>}
            {!cancelStep && <button className="btn ghost" onClick={() => { setCancelStep(true); toast('Avise os passageiros antes de cancelar.') }}>Cancelar carona</button>}
          </div>
        </>
      )}
    </article>
  )
}

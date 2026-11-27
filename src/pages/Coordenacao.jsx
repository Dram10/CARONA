import { useState } from 'react'
import { supabase } from '../supabase.js'
import { WaButton, paxStatus } from '../components/RideCard.jsx'
import { confirmWindow, dayName, firstName, hhmm, shortDay, showPhone, when } from '../lib.js'

// Painel da coordenação: pedidos para encaixar, confirmações e ocupação.
export default function Coordenacao({ me, rides, people, requests, run, toast }) {
  const [showTeam, setShowTeam] = useState(false)
  const open = requests.filter((x) => x.status === 'aberto')
  const left = (r) => r.seats - r.pax.length
  const free = rides.reduce((s, r) => s + left(r), 0)
  const riding = rides.reduce((s, r) => s + r.pax.length, 0)
  const name = (id) => people[id]?.name || 'Alguém'

  // Passageiros que ainda não confirmaram (véspera e dia)
  const pending = rides.filter(confirmWindow).flatMap((r) => r.pax.filter((b) => !b.confirmed_at).map((b) => ({ r, b })))

  async function assign(x, r) {
    const ok = await run(supabase.from('bookings').insert({ ride_id: r.id, passenger_id: x.person_id }))
    if (!ok) return
    await run(supabase.from('requests').update({ status: 'atendido', ride_id: r.id }).eq('id', x.id), `${name(x.person_id)} vai com ${name(r.driver_id)}.`)
  }

  function copySummary() {
    let t = '*Caronas Sonhar Acordado*\n'
    let last = ''
    for (const r of rides) {
      if (r.ride_date !== last) { t += `\n*${dayName(r.ride_date)}*\n`; last = r.ride_date }
      t += `${hhmm(r.ride_time)} ${r.origin} → ${r.destination} · ${name(r.driver_id)} · ${left(r) ? left(r) + ' vaga(s)' : 'lotada'}\n`
    }
    if (open.length) t += `\nAinda precisam de carona: ${open.map((x) => `${name(x.person_id)} (${shortDay(x.req_date)})`).join(', ')}\n`
    t += '\nReserve pelo app.'
    navigator.clipboard?.writeText(t).then(() => toast('Resumo copiado. É só colar no grupo.'), () => toast('Não foi possível copiar.'))
  }

  const toggleCoord = (p) =>
    run(supabase.from('profiles').update({ is_coord: !p.is_coord }).eq('id', p.id), p.is_coord ? `${p.name} saiu da coordenação.` : `${p.name} agora é da coordenação.`)

  return (
    <>
      <h1>Painel da coordenação</h1>
      <p className="sub">Quem precisa de carona e onde ainda tem lugar.</p>
      <div className="stats">
        <div className="stat hot"><b>{open.length}</b><span>pedidos sem carona</span></div>
        <div className="stat"><b>{pending.length}</b><span>ainda não confirmaram</span></div>
        <div className="stat"><b>{free}</b><span>vagas livres</span></div>
        <div className="stat"><b>{riding}</b><span>pessoas com carona</span></div>
      </div>

      <h2>Pedidos para encaixar</h2>
      {open.length === 0 && <div className="empty">Nenhum pedido em aberto.</div>}
      {open.map((x) => {
        const opts = rides
          .filter((r) => r.ride_date === x.req_date && left(r) > 0 && r.driver_id !== x.person_id && !r.pax.some((b) => b.passenger_id === x.person_id))
          .sort((a, b) => (b.destination === x.destination) - (a.destination === x.destination))
        const p = people[x.person_id] || {}
        return (
          <div key={x.id} className="card">
            <div className="route">{name(x.person_id)}</div>
            <div className="meta">{dayName(x.req_date)}, {hhmm(x.req_time)} · {x.origin} → {x.destination}{x.note ? ' · ' + x.note : ''}</div>
            <div className="acts">
              {opts.length
                ? opts.map((r) => <button key={r.id} className="btn sea" onClick={() => assign(x, r)}>Encaixar com {firstName(name(r.driver_id))} às {hhmm(r.ride_time)}</button>)
                : <span className="chip">Nenhuma carona com vaga nesse dia</span>}
              <WaButton phone={p.phone} text={`Oi, ${firstName(p.name)}! Aqui é ${me.name}, da coordenação da Sonhar Acordado, sobre seu pedido de carona para ${shortDay(x.req_date)}.`}>Falar</WaButton>
            </div>
          </div>
        )
      })}

      <h2>Confirmações pendentes</h2>
      {pending.length === 0 && <div className="empty">Todo mundo de hoje e amanhã já confirmou.</div>}
      {pending.map(({ r, b }) => {
        const p = people[b.passenger_id] || {}
        return (
          <div key={b.id} className="card acts" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
            <span><b>{p.name}</b><br /><span className="meta">{when(r)} com {firstName(name(r.driver_id))}</span></span>
            <WaButton phone={p.phone} text={`Oi, ${firstName(p.name)}! Lembrete da carona Sonhar Acordado ${when(r)} (${r.origin} → ${r.destination}). Confirme no app se vai mesmo, por favor, para liberarmos a vaga se não puder.`}>Lembrar</WaButton>
          </div>
        )
      })}

      <h2>Ocupação das caronas</h2>
      {rides.length === 0 && <div className="empty">Nenhuma carona marcada.</div>}
      {rides.map((r) => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b>{shortDay(r.ride_date)} {hhmm(r.ride_time)}</b>
            <span className="meta">{r.pax.length}/{r.seats}</span>
          </div>
          <div className="meta">{name(r.driver_id)} · {r.origin} → {r.destination}</div>
          <div className="meta">
            {r.pax.length ? r.pax.map((b, i) => {
              const [t, c] = paxStatus(r, b)
              return <span key={b.id}>{i ? ', ' : ''}{name(b.passenger_id)} <span className={'st ' + c}>{t}</span></span>
            }) : 'Sem passageiros'}
          </div>
          {r.delay_min && <span className="chip late">Atraso de ~{r.delay_min} min</span>}
          <div className="bar"><i style={{ width: `${Math.round((r.pax.length / r.seats) * 100)}%` }} /></div>
        </div>
      ))}

      <div className="acts" style={{ marginTop: 14 }}>
        <button className="btn ghost" onClick={copySummary}>Copiar resumo para o grupo</button>
        <button className="btn ghost" onClick={() => setShowTeam(!showTeam)}>{showTeam ? 'Esconder' : 'Ver'} pessoas cadastradas</button>
      </div>

      {showTeam && (
        <>
          <h2>Pessoas cadastradas ({Object.keys(people).length})</h2>
          {Object.values(people).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
            <div key={p.id} className="card acts" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
              <span><b>{p.name}</b> {p.is_coord && <span className="chip ok">coordenação</span>}<br /><span className="meta">{showPhone(p.phone)}{p.bairro ? ' · ' + p.bairro : ''}</span></span>
              {p.id !== me.id && <button className="btn ghost" onClick={() => toggleCoord(p)}>{p.is_coord ? 'Tirar da coordenação' : 'Tornar coordenação'}</button>}
            </div>
          ))}
        </>
      )}
    </>
  )
}

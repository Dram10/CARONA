import { useState } from 'react'
import RideCard from '../components/RideCard.jsx'
import { dayName } from '../lib.js'

// Lista das próximas caronas, com busca.
export default function Caronas({ rides, people, me, run, toast, go }) {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const list = rides.filter((r) => !s || `${r.origin} ${r.destination} ${people[r.driver_id]?.name || ''}`.toLowerCase().includes(s))
  let last = ''

  return (
    <>
      <h1>Próximas caronas</h1>
      <p className="sub">Olá, {me.name.split(' ')[0]}! Escolha uma carona e reserve sua vaga.</p>
      <input type="search" placeholder="Buscar por bairro, destino ou motorista" aria-label="Buscar caronas" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 && <div className="empty" style={{ marginTop: 16 }}>{rides.length ? 'Nenhuma carona encontrada nessa busca.' : 'Ainda não há caronas marcadas.'}</div>}
      {list.map((r) => {
        const head = r.ride_date !== last ? <div className="day">{dayName(r.ride_date)}</div> : null
        last = r.ride_date
        return (
          <div key={r.id}>
            {head}
            <RideCard r={r} view="lista" me={me} people={people} run={run} toast={toast} />
          </div>
        )
      })}
      <div className="empty" style={{ marginTop: 16 }}>
        Não achou o que precisa?
        <div className="acts" style={{ justifyContent: 'center' }}>
          <button className="btn ghost" onClick={() => go('pedir')}>Pedir uma carona</button>
          <button className="btn ghost" onClick={() => go('oferecer')}>Oferecer carona</button>
        </div>
      </div>
    </>
  )
}

import RideCard from '../components/RideCard.jsx'
import { supabase } from '../supabase.js'
import { dayName, hhmm } from '../lib.js'

// O que a pessoa combinou: vagas reservadas, caronas oferecidas e pedidos.
export default function Minhas({ me, rides, people, requests, run, toast, go }) {
  const asPax = rides.filter((r) => r.pax.some((b) => b.passenger_id === me.id))
  const asDriver = rides.filter((r) => r.driver_id === me.id)
  const mine = requests.filter((x) => x.person_id === me.id)
  const card = (r, view) => <RideCard key={r.id} r={r} view={view} me={me} people={people} run={run} toast={toast} />

  return (
    <>
      <h1>Minhas caronas</h1>
      <p className="sub">Tudo o que você combinou.</p>

      <h2>Vou de carona</h2>
      {asPax.length ? asPax.map((r) => card(r, 'passageiro')) : <div className="empty">Você não reservou nenhuma vaga.</div>}

      <h2>Estou oferecendo</h2>
      {asDriver.length ? asDriver.map((r) => card(r, 'motorista')) : (
        <div className="empty">
          Nenhuma carona oferecida.
          <div className="acts" style={{ justifyContent: 'center' }}><button className="btn ghost" onClick={() => go('oferecer')}>Oferecer carona</button></div>
        </div>
      )}

      {mine.length > 0 && <h2>Meus pedidos</h2>}
      {mine.map((x) => (
        <div key={x.id} className="card">
          <span className={'chip' + (x.status === 'atendido' ? ' ok' : '')}>{x.status === 'atendido' ? 'Carona encontrada' : 'Aguardando coordenação'}</span>
          <div className="route" style={{ marginTop: 6 }}>{x.origin} → {x.destination}</div>
          <div className="meta">{dayName(x.req_date)}, por volta de {hhmm(x.req_time)}</div>
          {x.status === 'aberto' && (
            <div className="acts">
              <button className="btn ghost" onClick={() => run(supabase.from('requests').update({ status: 'cancelado' }).eq('id', x.id), 'Pedido cancelado.')}>Cancelar pedido</button>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

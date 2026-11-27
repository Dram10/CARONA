import { useState } from 'react'
import { supabase } from '../supabase.js'
import { DESTINOS, iso } from '../lib.js'

// Pedido de carona para a coordenação encaixar.
export default function Pedir({ me, rides, run, go }) {
  const [f, setF] = useState({ date: iso(1), time: '08:00', origin: me.bairro || '', destination: 'Sede da ONG', note: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sameDay = rides.filter((r) => r.ride_date === f.date && r.seats > r.pax.length && r.driver_id !== me.id)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await run(
      supabase.from('requests').insert({
        person_id: me.id, req_date: f.date, req_time: f.time, origin: f.origin.trim(),
        destination: f.destination.trim(), note: f.note.trim() || null,
      }),
      'Pedido enviado para a coordenação.'
    )
    setBusy(false)
    if (ok) go('minhas')
  }

  return (
    <>
      <h1>Pedir carona</h1>
      <p className="sub">A coordenação vê seu pedido e encaixa você numa carona.</p>
      {sameDay.length > 0 && (
        <div className="cbox" style={{ marginBottom: 14 }}>
          Já existe{sameDay.length > 1 ? 'm' : ''} {sameDay.length} carona{sameDay.length > 1 ? 's' : ''} com vaga nesse dia.{' '}
          <button className="btn sea" style={{ marginTop: 8 }} onClick={() => go('caronas')}>Ver caronas</button>
        </div>
      )}
      <form onSubmit={submit}>
        <datalist id="destinos">{DESTINOS.map((d) => <option key={d} value={d} />)}</datalist>
        <div className="row2">
          <label>Dia<input type="date" required min={iso(0)} value={f.date} onChange={set('date')} /></label>
          <label>Chegar por volta de<input type="time" required value={f.time} onChange={set('time')} /></label>
        </div>
        <label>Saindo de<input required minLength={2} maxLength={120} placeholder="Bairro" value={f.origin} onChange={set('origin')} /></label>
        <label>Indo para<input required minLength={2} maxLength={120} list="destinos" value={f.destination} onChange={set('destination')} /></label>
        <label>Algo que precisamos saber? (opcional)<textarea maxLength={300} placeholder="Ex.: vou com criança, cadeira de rodas, preciso de volta" value={f.note} onChange={set('note')} /></label>
        <button className="btn wide" disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido'}</button>
      </form>
    </>
  )
}

import { useState } from 'react'
import { supabase } from '../supabase.js'
import { DESTINOS, iso } from '../lib.js'

// Formulário para o motorista oferecer uma carona.
export default function Oferecer({ me, run, go }) {
  const [f, setF] = useState({ date: iso(1), time: '08:00', origin: me.bairro || '', destination: 'Sede da ONG', seats: 3, note: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const seats = (d) => setF({ ...f, seats: Math.min(8, Math.max(1, f.seats + d)) })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await run(
      supabase.from('rides').insert({
        driver_id: me.id, ride_date: f.date, ride_time: f.time, origin: f.origin.trim(),
        destination: f.destination.trim(), seats: f.seats, note: f.note.trim() || null,
      }),
      'Carona publicada! Já aparece para todos.'
    )
    setBusy(false)
    if (ok) go('minhas')
  }

  return (
    <>
      <h1>Oferecer carona</h1>
      <p className="sub">Vai a uma atividade da ONG? Leve quem precisa.</p>
      <form onSubmit={submit}>
        <datalist id="destinos">{DESTINOS.map((d) => <option key={d} value={d} />)}</datalist>
        <div className="row2">
          <label>Dia<input type="date" required min={iso(0)} value={f.date} onChange={set('date')} /></label>
          <label>Saída<input type="time" required value={f.time} onChange={set('time')} /></label>
        </div>
        <label>Saindo de<input required minLength={2} maxLength={120} placeholder="Bairro ou ponto de encontro" value={f.origin} onChange={set('origin')} /></label>
        <label>Indo para<input required minLength={2} maxLength={120} list="destinos" value={f.destination} onChange={set('destination')} /></label>
        <div>
          <label htmlFor="vagas">Vagas no carro</label>
          <div className="step">
            <button type="button" onClick={() => seats(-1)} aria-label="Menos uma vaga">−</button>
            <b id="vagas">{f.seats}</b>
            <button type="button" onClick={() => seats(1)} aria-label="Mais uma vaga">+</button>
          </div>
        </div>
        <label>Recado (opcional)<textarea maxLength={300} placeholder="Ex.: saio da frente do mercado, volto às 18h" value={f.note} onChange={set('note')} /></label>
        <button className="btn wide" disabled={busy}>{busy ? 'Publicando…' : 'Publicar carona'}</button>
      </form>
    </>
  )
}

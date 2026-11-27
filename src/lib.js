// Funções de apoio: datas, textos e links do WhatsApp.

// Data local (fuso do celular) no formato AAAA-MM-DD, com deslocamento em dias.
export function iso(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const asDate = (d) => new Date(d + 'T12:00')

export function dayName(d) {
  if (d === iso(0)) return 'Hoje'
  if (d === iso(1)) return 'Amanhã'
  const s = asDate(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s[0].toUpperCase() + s.slice(1)
}

export function shortDay(d) {
  if (d === iso(0)) return 'hoje'
  if (d === iso(1)) return 'amanhã'
  return asDate(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const hhmm = (t) => (t || '').slice(0, 5)
export const when = (r) => `${shortDay(r.ride_date)} às ${hhmm(r.ride_time)}`
export const firstName = (name) => (name || 'Alguém').split(' ')[0]

// A confirmação de presença abre na véspera e no dia da carona.
export const confirmWindow = (r) => r.ride_date === iso(0) || r.ride_date === iso(1)

// Deixa só os números do telefone. Ex.: "(11) 98765-4321" -> "11987654321"
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '')

// Formata para exibir: 11987654321 -> (11) 98765-4321
export function showPhone(p) {
  const d = onlyDigits(p).replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

// Link do WhatsApp com mensagem pronta. Sem telefone, o WhatsApp pede para escolher o contato.
export function waLink(phone, text) {
  let n = onlyDigits(phone)
  if (n.length === 10 || n.length === 11) n = '55' + n // número brasileiro sem o 55
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export const DESTINOS = ['Sede da ONG', 'Ação na Praça Central', 'Reunião de voluntários', 'Bazar solidário']

import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/appointments'
const LOCAL_KEY = 'pawcare-local-appointments'

const services = [
  { icon: '🩺', name: 'Wellness visits', description: 'Nose-to-tail checkups, vaccinations, and thoughtful preventive care.', detail: 'From $45' },
  { icon: '🦷', name: 'Dental care', description: 'Gentle cleanings and oral health support for brighter, happier smiles.', detail: 'From $80' },
  { icon: '✂️', name: 'Bath & grooming', description: 'A soothing bath, tidy trim, and a little extra love on the way out.', detail: 'From $35' },
  { icon: '🐾', name: 'New pet visits', description: 'A friendly first visit to help your newest family member feel at home.', detail: 'From $55' },
]

const emptyForm = {
  ownerName: '',
  ownerPhone: '',
  petName: '',
  petType: '',
  service: '',
  appointmentDate: '',
  appointmentTime: '',
  notes: '',
}

function readLocalAppointments() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch (error) {
    console.warn('Could not read local PawCare reminders:', error)
    return []
  }
}

function formatDate(value) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime())
    ? 'Date to be confirmed'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })
}

function App() {
  const [view, setView] = useState('home')
  const [appointments, setAppointments] = useState([])
  const [localAppointments, setLocalAppointments] = useState(readLocalAppointments)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadAppointments() {
      try {
        const response = await fetch(API_URL, { signal: controller.signal })
        if (!response.ok) throw new Error(`Appointment service returned ${response.status}`)
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Appointment service returned an unexpected response')
        setAppointments(data)
        setApiError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setApiError('Clinic booking is currently offline. You can still keep a reminder on this device.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadAppointments()
    return () => controller.abort()
  }, [])

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitAppointment(event) {
    event.preventDefault()
    setSubmitting(true)
    setNotice(null)
    const payload = { ...form, status: 'pending' }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || `Appointment service returned ${response.status}`)
      }
      const appointment = await response.json()
      setAppointments((current) => [...current, appointment])
      setApiError('')
      setNotice({ type: 'success', message: 'Your request was sent to PawCare. Our team will be in touch to confirm.' })
    } catch (error) {
      console.warn('PawCare appointment request could not reach the clinic:', error)
      const localAppointment = {
        ...payload,
        _id: `local-${Date.now()}`,
        status: 'not-sent',
        savedLocally: true,
      }
      const nextLocalAppointments = [...localAppointments, localAppointment]
      setLocalAppointments(nextLocalAppointments)
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(nextLocalAppointments))
      } catch (storageError) {
        console.warn('Could not persist the PawCare reminder in this browser:', storageError)
        localAppointment.sessionOnly = true
        setLocalAppointments([...localAppointments, localAppointment])
      }
      setApiError('Clinic booking is currently offline. You can still keep a reminder on this device.')
      setNotice({
        type: 'offline',
        message: localAppointment.sessionOnly
          ? 'The clinic did not receive this request. This reminder lasts only until you close this page.'
          : 'This is only a reminder on this device. It was not sent to the clinic.',
      })
    } finally {
      setSubmitting(false)
      setForm(emptyForm)
    }
  }

  async function cancelAppointment(appointment) {
    if (appointment.savedLocally) {
      const nextLocalAppointments = localAppointments.filter((item) => item._id !== appointment._id)
      setLocalAppointments(nextLocalAppointments)
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(nextLocalAppointments))
      } catch (error) {
        console.warn('Could not update local PawCare reminders:', error)
      }
      return
    }

    try {
      const response = await fetch(`${API_URL}/${appointment._id}/cancel`, { method: 'PATCH' })
      if (!response.ok) throw new Error(`Appointment service returned ${response.status}`)
      const updatedAppointment = await response.json()
      setAppointments((current) => current.map((item) => (
        item._id === updatedAppointment._id ? updatedAppointment : item
      )))
    } catch (error) {
      console.warn('Could not cancel the PawCare appointment:', error)
      setNotice({ type: 'offline', message: 'We could not update this appointment. Please try again when the clinic service is available.' })
    }
  }

  const allAppointments = [...appointments, ...localAppointments]
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setView('home')} aria-label="PawCare home">
          <span className="brand-mark">✳</span>
          <span>pawcare<span className="brand-period">.</span></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#services" onClick={() => setView('home')}>Our care</a>
          <a href="#about" onClick={() => setView('home')}>Our promise</a>
          <button className={`nav-link ${view === 'appointments' ? 'selected' : ''}`} onClick={() => { setView('appointments'); setNotice(null) }}>
            My appointments
            {allAppointments.length > 0 && <span className="nav-count">{allAppointments.length}</span>}
          </button>
        </nav>
        <a className="button button-dark nav-cta" href="#book" onClick={() => setView('home')}>Book a visit <span aria-hidden="true">↗</span></a>
      </header>

      {view === 'home' ? (
        <main>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> YOUR NEIGHBORHOOD PET CLINIC</span>
              <h1>Good care.<br />Great <span>companions.</span></h1>
              <p className="hero-description">Because they make your world better. We make sure they feel their best, with kind, thoughtful care for every chapter.</p>
              <div className="hero-actions">
                <a className="button button-coral" href="#book">Make an appointment <span aria-hidden="true">↗</span></a>
                <a className="text-link" href="#services">Explore our care <span aria-hidden="true">↓</span></a>
              </div>
              <div className="trust-row">
                <div className="avatar-stack" aria-hidden="true"><span>🐶</span><span>🐱</span><span>🐕</span></div>
                <div><strong>Here for every wag &amp; whisker</strong><small>Care that feels like family</small></div>
              </div>
            </div>
            <div className="hero-art">
              <div className="sun-shape" />
              <div className="hero-photo">
                <img
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1100&q=85"
                  alt="A happy golden retriever enjoying a sunny day"
                  onError={(event) => { event.currentTarget.style.display = 'none' }}
                />
              </div>
              <div className="floating-note"><span className="note-icon">♡</span><span><strong>All the care</strong><small>All the cuddles</small></span></div>
              <div className="paw-stamp" aria-hidden="true">🐾</div>
            </div>
            <div className="hero-bottom">
              <span>GOOD HEALTH, GOOD DAYS</span>
              <span className="scroll-cue">SCROLL A LITTLE <span aria-hidden="true">↓</span></span>
              <span>EST. WITH LOVE · 2018</span>
            </div>
          </section>

          <section className="intro-strip" id="about">
            <span className="section-kicker">A LITTLE MORE HEART</span>
            <p>Care should feel good for <em>everyone</em> in the room.</p>
            <span className="intro-spark" aria-hidden="true">✳</span>
          </section>

          <section className="services-section section-pad" id="services">
            <div className="section-heading">
              <div><span className="section-kicker">HERE FOR THE WHOLE JOURNEY</span><h2>Care for their<br /><em>every day.</em></h2></div>
              <p>From first hello to the little things that keep tails wagging, find the care your best friend needs.</p>
            </div>
            <div className="service-grid">
              {services.map((service, index) => (
                <article className={`service-card service-card-${index + 1}`} key={service.name}>
                  <div className="service-top"><span className="service-icon">{service.icon}</span><span className="service-number">0{index + 1}</span></div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <div className="service-bottom"><span>{service.detail}</span><a href="#book" aria-label={`Book ${service.name}`}>↗</a></div>
                </article>
              ))}
            </div>
          </section>

          <section className="booking-section section-pad" id="book">
            <div className="booking-copy">
              <span className="section-kicker">LET'S MAKE THEIR DAY</span>
              <h2>A good day<br />starts with <em>good care.</em></h2>
              <p>Tell us a little about your companion and we’ll help find a time that works for you both.</p>
              <div className="booking-info"><span>✦</span><p><strong>Questions first?</strong><br />Call us at <a href="tel:+15550142023">(555) 014-2023</a><br />Mon–Sat, 8am–6pm</p></div>
            </div>
            <form className="booking-form" onSubmit={submitAppointment}>
              <div className="form-heading"><span>✳</span><div><h3>Request a visit</h3><p>We’ll be in touch to confirm your time.</p></div></div>
              <div className="form-grid">
                <label>Your name<input name="ownerName" value={form.ownerName} onChange={updateForm} placeholder="Jamie Parker" autoComplete="name" required /></label>
                <label>Phone number<input name="ownerPhone" type="tel" value={form.ownerPhone} onChange={updateForm} placeholder="(555) 000-0000" autoComplete="tel" required /></label>
                <label>Pet’s name<input name="petName" value={form.petName} onChange={updateForm} placeholder="Milo" required /></label>
                <label>Pet type<select name="petType" value={form.petType} onChange={updateForm} required><option value="" disabled>Select one</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Other</option></select></label>
                <label className="form-wide">What can we help with?<select name="service" value={form.service} onChange={updateForm} required><option value="" disabled>Choose a service</option>{services.map((service) => <option key={service.name}>{service.name}</option>)}<option>Something else</option></select></label>
                <label>Preferred date<input name="appointmentDate" type="date" min={today} value={form.appointmentDate} onChange={updateForm} required /></label>
                <label>Preferred time<select name="appointmentTime" value={form.appointmentTime} onChange={updateForm} required><option value="" disabled>Select a time</option><option>9:00 AM</option><option>10:30 AM</option><option>12:00 PM</option><option>1:30 PM</option><option>3:00 PM</option><option>4:30 PM</option></select></label>
                <label className="form-wide">Anything else we should know? <span className="optional">(optional)</span><textarea name="notes" value={form.notes} onChange={updateForm} placeholder="A little note about your pet..." rows="2" /></label>
              </div>
              <button className="button button-coral submit-button" type="submit" disabled={submitting}>{submitting ? 'Sending request…' : 'Request an appointment'} <span aria-hidden="true">↗</span></button>
              <p className="form-footnote">Request only — your visit is confirmed after our team gets in touch.</p>
              {notice && <p className={`notice notice-${notice.type}`} role="status">{notice.message}</p>}
            </form>
          </section>
        </main>
      ) : (
        <main className="appointments-page">
          <div className="appointments-heading">
            <span className="section-kicker">YOUR PET'S CARE, ALL IN ONE PLACE</span>
            <h1>My <em>appointments.</em></h1>
            <p>Keep track of your upcoming visits and reminders.</p>
            <a className="button button-coral" href="#book" onClick={() => setView('home')}>Request a visit <span aria-hidden="true">↗</span></a>
          </div>
          {apiError && <p className="connection-notice" role="status"><span>●</span> {apiError}</p>}
          {loading ? <p className="empty-state">Checking for clinic appointments…</p> : allAppointments.length === 0 ? (
            <div className="empty-state"><span className="empty-paw">🐾</span><h2>No visits just yet.</h2><p>When you request an appointment, it’ll show up here.</p><a className="text-link" href="#book" onClick={() => setView('home')}>Find a time <span aria-hidden="true">↗</span></a></div>
          ) : (
            <div className="appointment-list">
              {allAppointments.map((appointment) => (
                <article className="appointment-card" key={appointment._id}>
                  <div className="appointment-date"><span>{formatDate(appointment.appointmentDate)}</span><strong>{appointment.appointmentTime}</strong></div>
                  <div className="appointment-details"><h2>{appointment.petName} <span>· {appointment.service}</span></h2><p>For {appointment.ownerName} · {appointment.petType}</p>                  {appointment.savedLocally && <p className="local-label">{appointment.sessionOnly ? 'Session reminder · not sent to clinic' : 'On this device only · not sent to clinic'}</p>}</div>
                  <div className={`status-pill status-${appointment.savedLocally ? 'local' : appointment.status}`}>{appointment.savedLocally ? 'Local reminder' : appointment.status || 'pending'}</div>
                  <button className="remove-button" onClick={() => cancelAppointment(appointment)} aria-label={appointment.savedLocally ? `Remove ${appointment.petName} reminder` : `Cancel ${appointment.petName} appointment`}>{appointment.savedLocally ? 'Remove' : 'Cancel'}</button>
                </article>
              ))}
            </div>
          )}
          {notice && <p className={`notice notice-${notice.type}`} role="status">{notice.message}</p>}
          <p className="appointments-note">Local reminders are saved only in this browser and are not clinic bookings.</p>
        </main>
      )}

      <footer className="footer">
        <a className="brand footer-brand" href="#home" onClick={() => setView('home')}><span className="brand-mark">✳</span><span>pawcare<span className="brand-period">.</span></span></a>
        <p>For all the love they give.</p>
        <span>© 2026 PawCare Veterinary</span>
      </footer>
    </div>
  )
}

export default App

'use client';

import Link from "next/link";
import { useState } from "react";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function Contatti() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefono: '',
    tipoEvento: '',
    data: '',
    location: '',
    messaggio: '',
    website: '', // Honeypot field - deve rimanere vuoto
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Genera token reCAPTCHA
      if (!executeRecaptcha) {
        throw new Error('reCAPTCHA non disponibile');
      }

      const recaptchaToken = await executeRecaptcha('contact_form');

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante l\'invio');
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          nome: '',
          email: '',
          telefono: '',
          tipoEvento: '',
          data: '',
          location: '',
          messaggio: '',
          website: '',
        });
      }, 5000);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'Errore durante l\'invio. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-gray-900 border-b border-gray-800 py-3">
        <div className="container-custom">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-300 hover:text-accent font-medium">Home</Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white font-bold" aria-current="page">Contatti</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-900 to-black">
        <div className="container-custom text-center px-4">
          <h1 className="mb-6 text-white">Contatti</h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto font-semibold leading-relaxed text-gray-300">
            Scrivimi o chiamami per verificare la disponibilità e ricevere un preventivo personalizzato.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section id="contatti" className="py-12 md:py-16 bg-black">
        <div className="container-custom max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Left: Contact Info */}
            <div>
              <h2 className="mb-8 text-white">Informazioni di contatto</h2>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 text-accent flex-shrink-0 mx-auto sm:mx-0">
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">Email</h3>
                    <a href="mailto:info@mommydj.com" className="text-accent hover:underline font-medium text-base">
                      info@mommydj.com
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 text-accent flex-shrink-0 mx-auto sm:mx-0">
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">Telefono</h3>
                    <a href="tel:+393462122933" className="text-accent hover:underline font-medium text-base">
                      +39 346 212 2933
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-10 h-10 text-accent flex-shrink-0 mx-auto sm:mx-0">
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">WhatsApp</h3>
                    <a 
                      href="https://wa.me/393462122933" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-6 py-3 rounded-full font-bold transition-all duration-300 text-sm shadow-lg hover:shadow-xl hover:scale-105 uppercase tracking-wide"
                    >
                      Scrivimi su WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <div className="card bg-gray-800 border-2 border-gray-700 p-6 md:p-8">
                <h2 className="mb-6 text-white uppercase leading-tight" style={{fontSize: '1.125rem', letterSpacing: '0.02em'}}>Richiesta informazioni</h2>
                
                {isSubmitted && (
                  <div className="bg-green-900 border border-green-600 text-green-200 px-4 py-3 rounded mb-6">
                    <strong>Grazie!</strong> Ti risponderò al più presto.
                  </div>
                )}

                {error && (
                  <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-6">
                    <strong>Errore:</strong> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-bold mb-2 text-white">
                      Nome e Cognome *
                    </label>
                    <input
                      type="text"
                      id="nome"
                      name="nome"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white placeholder-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Mario Rossi"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-bold mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white placeholder-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="email@esempio.it"
                      />
                    </div>

                    <div>
                      <label htmlFor="telefono" className="block text-sm font-bold mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white placeholder-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="+39 346 212 2933"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tipoEvento" className="block text-sm font-bold mb-2">
                        Tipo di evento *
                      </label>
                      <select
                        id="tipoEvento"
                        name="tipoEvento"
                        required
                        value={formData.tipoEvento}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleziona...</option>
                        <option value="matrimonio">Matrimonio</option>
                        <option value="18-anni">18 anni</option>
                        <option value="30-anni">30 anni</option>
                        <option value="40-anni">40 anni</option>
                        <option value="50-anni">50 anni</option>
                        <option value="anniversario">Anniversario</option>
                        <option value="aziendale">Evento Aziendale</option>
                        <option value="altro">Altro</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="data" className="block text-sm font-bold mb-2">
                        Data evento
                      </label>
                      <input
                        type="date"
                        id="data"
                        name="data"
                        value={formData.data}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-bold mb-2">
                      Location / Città
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      placeholder="es. Milano"
                      value={formData.location}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white placeholder-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Honeypot field - invisibile agli utenti, visibile ai bot */}
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="website">
                      Website (lasciare vuoto)
                    </label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label htmlFor="messaggio" className="block text-sm font-bold mb-2">
                      Messaggio
                    </label>
                    <textarea
                      id="messaggio"
                      name="messaggio"
                      rows={4}
                      value={formData.messaggio}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-gray-900 text-white placeholder-gray-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Raccontami del tuo evento..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#4169e1] to-blue-600 hover:from-blue-600 hover:to-[#4169e1] text-white px-8 py-4 rounded-full font-bold transition-all duration-300 text-base shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wide"
                  >
                    {isLoading ? 'Invio in corso...' : 'Invia richiesta'}
                  </button>
                </form>

                <p className="text-sm text-center mt-6 px-4" style={{ color: '#ffffff' }}>
                  Questo sito è protetto da reCAPTCHA e si applicano la{' '}
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-semibold"
                  >
                    Privacy Policy
                  </a>
                  {' '}e i{' '}
                  <a 
                    href="https://policies.google.com/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-semibold"
                  >
                    Termini di Servizio
                  </a>
                  {' '}di Google.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

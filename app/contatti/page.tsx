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
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                      {/* Busta email più chiara */}
                      <rect x="8" y="18" width="48" height="32" rx="3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 22L32 38L56 22" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"/>
                      <path d="M8 46L24 34M56 46L40 34" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" opacity="0.6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">Email</h3>
                    <a href="mailto:info@mommydj.com" className="text-accent hover:underline font-medium text-base">
                      info@mommydj.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                      {/* Telefono classico più riconoscibile */}
                      <rect x="18" y="10" width="28" height="44" rx="5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="32" cy="48" r="3" fill="currentColor"/>
                      <line x1="26" y1="16" x2="38" y2="16" strokeLinecap="round" strokeWidth="4"/>
                      <rect x="22" y="20" width="20" height="22" rx="2" opacity="0.15" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">Telefono</h3>
                    <a href="tel:+393462122933" className="text-accent hover:underline font-medium text-base">
                      +39 346 212 2933
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                      {/* Logo WhatsApp riconoscibile */}
                      <circle cx="32" cy="32" r="22" strokeWidth="4"/>
                      <path d="M32 18C24 18 18 24 18 32C18 34.5 18.7 36.8 20 38.8L18 46L25.5 44C27.4 45.2 29.6 46 32 46C40 46 46 40 46 32C46 24 40 18 32 18Z" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M38 34C38 34 36 36 34 36C32 36 29 34 27 32C25 30 24 27 25 26C26 25 27 25 28 26L29 28" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-white">WhatsApp</h3>
                    <a 
                      href="https://wa.me/393462122933" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg font-bold transition-colors text-sm shadow-sm"
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
                    className="w-full bg-[#4169e1] hover:bg-[#3557c7] text-white px-8 py-4 rounded-lg font-bold transition-all duration-300 text-base shadow-lg hover:shadow-[#4169e1]/50 border-2 border-[#4169e1] hover:border-[#3557c7] transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? 'Invio in corso...' : 'Invia richiesta'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

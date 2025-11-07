'use client';

import Link from "next/link";
import { useState } from "react";

export default function Contatti() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefono: '',
    tipoEvento: '',
    data: '',
    location: '',
    messaggio: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
      <section className="py-12 md:py-16 bg-black">
        <div className="container-custom max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Left: Contact Info */}
            <div>
              <h2 className="mb-8 text-white">Informazioni di contatto</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="8" y="16" width="48" height="32" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 20L32 36L56 20" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 44L24 32M56 44L40 32" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
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
                  <div className="w-10 h-10 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="16" y="12" width="32" height="40" rx="4" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="32" cy="46" r="2" fill="currentColor"/>
                      <rect x="20" y="16" width="24" height="24" rx="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
                      <path d="M24 22H40M24 26H40M24 30H36" strokeLinecap="round" opacity="0.5"/>
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
                  <div className="w-10 h-10 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="12" y="12" width="40" height="40" rx="8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 28L28 36L44 20" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
                      <circle cx="32" cy="32" r="16" opacity="0.1" fill="currentColor"/>
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

              {/* Zone coperte */}
              <div className="mt-12 card bg-gray-800 border-2 border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 text-accent flex-shrink-0">
                    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M32 12L32 40M32 40L28 36M32 40L36 36" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="32" cy="12" r="6" fill="currentColor"/>
                      <circle cx="32" cy="12" r="3" fill="white"/>
                      <path d="M20 48C20 48 24 40 32 40C40 40 44 48 44 48" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="font-bold text-white">Zone coperte</h3>
                </div>
                <p className="mb-4 font-semibold text-white">
                  Opero principalmente in Lombardia e nelle regioni limitrofe:
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="font-medium">• Milano e provincia</li>
                  <li className="font-medium">• Bergamo e provincia</li>
                  <li className="font-medium">• Brescia e provincia</li>
                  <li className="font-medium">• Como e Lecco</li>
                  <li className="font-medium">• Emilia Romagna (Bologna, Modena, Parma)</li>
                  <li className="font-medium">• Piemonte (Torino, Alessandria, Novara)</li>
                </ul>
                <p className="text-sm mt-4 font-medium text-gray-400">
                  Per eventi in altre zone, contattami per valutare la fattibilità.
                </p>
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
                    className="w-full bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-lg font-bold transition-colors text-base shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

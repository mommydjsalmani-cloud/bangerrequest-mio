'use client';

import Link from "next/link";
import { useState } from "react";

export default function Matrimoni() {
  const [activePhase, setActivePhase] = useState(0);

  const phases = [
    {
      id: 0,
      title: "Accoglienza & Cerimonia",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* Chiesa con campanile */}
          <path d="M32 8L44 20V54H20V20L32 8Z" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="28" y="44" width="8" height="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24 30H40M24 36H40" strokeLinecap="round"/>
          <rect x="30" y="4" width="4" height="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M28 6H36" strokeLinecap="round"/>
        </svg>
      ),
      description: "Dalla musica di benvenuto agli ingressi, fino ai momenti chiave della cerimonia.",
      details: "Curo la colonna sonora dall'accoglienza degli ospiti fino all'uscita degli sposi. Coordino microfoni per letture e celebrante, testando tutto in anticipo. Volume e atmosfera calibrati per emozionare senza sovrastare."
    },
    {
      id: 1,
      title: "Aperitivo",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* Calice champagne */}
          <path d="M20 12L22 28C22 34 26 38 32 38C38 38 42 34 44 28L46 12Z" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="32" y1="38" x2="32" y2="52" strokeLinecap="round"/>
          <line x1="24" y1="52" x2="40" y2="52" strokeLinecap="round" strokeWidth="3"/>
          <path d="M18 12H48" strokeLinecap="round"/>
          {/* Bollicine */}
          <circle cx="28" cy="18" r="1.5" fill="currentColor"/>
          <circle cx="32" cy="22" r="1.5" fill="currentColor"/>
          <circle cx="36" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      ),
      description: "Musica lounge e soft che accompagna le conversazioni senza coprire le voci.",
      details: "Selezione musicale elegante e discreta. Volume ottimale per permettere conversazioni naturali. Coordino i cambi di mood con wedding planner e catering per transizioni fluide e armoniose."
    },
    {
      id: 2,
      title: "Dinner Set",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* Piatto con posate */}
          <circle cx="32" cy="32" r="16" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="32" cy="32" r="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
          {/* Forchetta */}
          <path d="M14 20V34M11 20V28M17 20V28" strokeLinecap="round"/>
          <line x1="14" y1="28" x2="14" y2="44" strokeLinecap="round" strokeWidth="3.5"/>
          {/* Coltello */}
          <line x1="50" y1="20" x2="50" y2="44" strokeLinecap="round" strokeWidth="3.5"/>
          <path d="M48 20L52 20L52 26L48 26Z" fill="currentColor"/>
        </svg>
      ),
      description: "Sottofondo musicale durante la cena, con cue precisi per momenti speciali.",
      details: "Musica selezionata per accompagnare la cena senza distrarre. Entrata sposi, brindisi e taglio torta sincronizzati con fotografo e cucina. Microfoni pronti per interventi e discorsi degli ospiti."
    },
    {
      id: 3,
      title: "Party Finale",
      icon: (
        <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* Console DJ */}
          <rect x="12" y="24" width="40" height="24" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Piatti */}
          <circle cx="22" cy="36" r="7" strokeWidth="3"/>
          <circle cx="42" cy="36" r="7" strokeWidth="3"/>
          <circle cx="22" cy="36" r="2" fill="currentColor"/>
          <circle cx="42" cy="36" r="2" fill="currentColor"/>
          {/* Slider */}
          <line x1="32" y1="28" x2="32" y2="38" strokeLinecap="round" strokeWidth="3"/>
          <rect x="30" y="31" width="4" height="3" rx="0.5" fill="currentColor"/>
          {/* Onde sonore */}
          <path d="M8 36C8 36 6 32 6 28C6 24 8 20 8 20" strokeLinecap="round" opacity="0.5"/>
          <path d="M56 36C56 36 58 32 58 28C58 24 56 20 56 20" strokeLinecap="round" opacity="0.5"/>
        </svg>
      ),
      description: "DJ set dinamico con lettura del pubblico in tempo reale e musica live.",
      details: "Alternanza di generi e ritmi (house, pop, R&B, hip hop, '70-'80, latino) con mashup e transizioni creative. Coordino musicisti e cantanti live quando presenti. Gli ospiti inviano richieste tramite app dedicata per mantenere energia e coinvolgimento costanti."
    }
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="bg-gray-900 border-b border-gray-800 py-3">
        <div className="container-custom">
          <div className="flex items-center gap-2 text-sm text-gray-400 font-sans">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Matrimoni</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-16 md:py-32 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="container-custom text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 text-accent">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
              {/* Fedi nuziali intrecciate */}
              <circle cx="26" cy="32" r="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5"/>
              <circle cx="38" cy="32" r="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5"/>
              <path d="M26 20V24M38 20V24" strokeLinecap="round" strokeWidth="3.5"/>
              <circle cx="26" cy="32" r="8" opacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="38" cy="32" r="8" opacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="mb-4 md:mb-6 text-white font-display px-4">DJ per Matrimoni</h1>
          <p className="font-sans text-base md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
            La musica accompagna ogni momento, ma quando si tratta del tuo matrimonio, deve raccontare la tua storia.<br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">Dalla cerimonia al party finale, curo ogni dettaglio sonoro, creando un'atmosfera che rispecchia voi e i vostri ospiti.</span>
          </p>
          <div className="mt-8 md:mt-10 px-4">
            <a
              href="#contatti"
              className="font-sans inline-block bg-gradient-to-r from-accent to-blue-600 hover:from-blue-600 hover:to-accent text-white px-10 md:px-14 py-4 md:py-5 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm md:text-base shadow-lg hover:shadow-2xl hover:scale-105"
            >
              Verifica disponibilità
            </a>
          </div>
        </div>
      </section>

      {/* Timeline - 4 Fasi */}
      <section className="py-12 md:py-20 bg-gray-900">
        <div className="container-custom max-w-6xl">
          <h2 className="text-center mb-8 md:mb-16 text-white uppercase tracking-wider px-4">Cosa Faccio</h2>
          <p className="font-sans text-center text-gray-300 max-w-3xl mx-auto mb-8 md:mb-12 text-base md:text-lg leading-relaxed px-4">
            Ogni matrimonio è unico.<br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">Preparo la colonna sonora di ogni fase: accoglienza e cerimonia, aperitivo e dinner set, party finale con DJ set e musica live.</span><br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">Coordino musicisti, cantanti e performer per garantire fluidità, ritmo e armonia durante tutta la giornata.</span>
          </p>
          
          {/* Tab Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12">
            {phases.map((phase) => (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                className={`p-4 md:p-6 rounded-xl border-2 transition-all text-center min-h-[130px] md:min-h-[160px] flex flex-col items-center justify-center gap-2 md:gap-3 ${
                  activePhase === phase.id
                    ? 'border-accent bg-gray-800 text-accent'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <div className="w-12 h-12 md:w-14 md:h-14">{phase.icon}</div>
                <h3 className="font-display font-semibold leading-[1.1] px-1" style={{fontSize: '0.65rem', letterSpacing: '0.01em'}}>{phase.title}</h3>
              </button>
            ))}
          </div>

          {/* Active Phase Content */}
          <div className="bg-gray-800 border border-gray-700 p-6 md:p-10 rounded-2xl">
            <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto md:mx-0 text-accent flex-shrink-0">{phases[activePhase].icon}</div>
              <div className="flex-1">
                <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-3 md:mb-4 text-center md:text-left">
                  {phases[activePhase].title}
                </h3>
                <p className="font-sans text-gray-300 mb-3 md:mb-4 text-base md:text-lg leading-relaxed">
                  {phases[activePhase].description}
                </p>
                <p className="font-sans text-gray-400 text-sm md:text-base leading-relaxed">
                  {phases[activePhase].details}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Approccio */}
      <section className="py-12 md:py-20 bg-black">
        <div className="container-custom max-w-4xl">
          <h2 className="text-center mb-8 md:mb-16 text-white uppercase tracking-wider px-4">Approccio</h2>
          <div className="bg-gray-800 border border-gray-700 p-6 md:p-10 rounded-2xl mb-8 md:mb-12">
            <div className="space-y-4 md:space-y-6 text-gray-300 leading-relaxed">
              <p className="font-sans text-base md:text-lg">
                Prima di ogni evento dedico tempo all'ascolto della coppia e alla costruzione della scaletta.
              </p>
              <p className="font-sans text-base md:text-lg">
                Mi confronto con la wedding planner, il catering e i tecnici audio per curare anche tempi e regia generale.
              </p>
              <p className="font-sans text-base md:text-lg">
                Durante la serata leggo il pubblico e adatto la musica in tempo reale, alternando generi e mashup per mantenere sempre energia e coinvolgimento.
              </p>
            </div>
          </div>

          {/* Destination Wedding */}
          <div className="bg-gray-800 border border-gray-700 p-6 md:p-10 rounded-2xl">
            <div className="text-center mb-4 md:mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-accent">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                  {/* Globo terrestre */}
                  <circle cx="32" cy="32" r="22" strokeWidth="3.5"/>
                  {/* Meridiani */}
                  <ellipse cx="32" cy="32" rx="10" ry="22" opacity="0.4"/>
                  <ellipse cx="32" cy="32" rx="22" ry="10" opacity="0.4"/>
                  {/* Paralleli */}
                  <path d="M14 20C14 20 20 22 32 22C44 22 50 20 50 20" strokeLinecap="round"/>
                  <path d="M14 44C14 44 20 42 32 42C44 42 50 44 50 44" strokeLinecap="round"/>
                  {/* Pin location */}
                  <path d="M32 24L32 28M28 30L32 28L36 30" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5"/>
                  <circle cx="32" cy="30" r="3" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="font-display text-xl md:text-2xl text-white mb-3 md:mb-4 px-4">Destination Wedding</h3>
            </div>
            <div className="space-y-3 md:space-y-4 text-gray-300 leading-relaxed">
              <p className="font-sans text-base md:text-lg">
                Ho lavorato con coppie provenienti da Irlanda, Inghilterra, Stati Uniti, India, Francia, Australia e molti altri paesi.
              </p>
              <p className="font-sans text-base md:text-lg">
                Comprendere culture musicali diverse è fondamentale per creare un'atmosfera accogliente per tutti gli ospiti.
              </p>
              <p className="font-sans text-base md:text-lg">
                Lavoro regolarmente in <strong className="text-white">Svizzera, Toscana, Lombardia e Veneto</strong>, collaborando con le migliori wedding planner italiane e internazionali.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Richiedi un Brano */}
      <section className="py-12 md:py-20 bg-gray-900">
        <div className="container-custom max-w-4xl">
          <div className="bg-gray-800 border border-gray-700 p-6 md:p-10 rounded-2xl">
            <div className="text-center mb-4 md:mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-accent">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                  {/* Smartphone */}
                  <rect x="18" y="8" width="28" height="48" rx="3" strokeWidth="3.5"/>
                  <circle cx="32" cy="52" r="2" fill="currentColor"/>
                  {/* Note musicali */}
                  <circle cx="26" cy="24" r="3" strokeWidth="3"/>
                  <circle cx="38" cy="28" r="3" strokeWidth="3"/>
                  <path d="M29 24V16L41 14V28" strokeWidth="3" strokeLinecap="round"/>
                  {/* Onde audio */}
                  <path d="M24 36H40M22 40H42M26 44H38" strokeLinecap="round" opacity="0.4"/>
                </svg>
              </div>
              <h2 className="font-display text-xl md:text-2xl text-white mb-4 md:mb-6 px-4">App "Richiedi un Brano"</h2>
            </div>
            <div className="space-y-3 md:space-y-4 text-gray-300 leading-relaxed">
              <p className="font-sans text-base md:text-lg text-center">
                Durante il party, gli ospiti possono inviare le loro richieste musicali in tempo reale tramite un'app dedicata che ho sviluppato personalmente.
              </p>
              <p className="font-sans text-base md:text-lg text-center">
                In questo modo ogni persona partecipa e la pista rimane sempre viva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contatti" className="py-12 md:py-20 bg-black">
        <div className="container-custom text-center max-w-2xl">
          <h2 className="font-display mb-4 md:mb-6 text-white px-4">Vuoi una colonna sonora creata su misura per il tuo matrimonio?</h2>
          <p className="font-sans text-gray-400 mb-8 md:mb-10 leading-relaxed px-4">
            Contattami per verificare la disponibilità e ricevere una proposta personalizzata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center px-4">
            <Link
              href="/contatti"
              className="font-sans inline-block bg-gradient-to-r from-accent to-blue-600 hover:from-blue-600 hover:to-accent text-white px-10 md:px-12 py-4 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Richiedi informazioni
            </Link>
            <a
              href="https://wa.me/393462122933"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans inline-block bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-10 md:px-12 py-4 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Scrivimi su WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

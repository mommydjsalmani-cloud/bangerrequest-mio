'use client';

import Link from "next/link";

export default function Service() {
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
            <li className="text-white font-bold" aria-current="page">Service</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-900 to-black">
        <div className="container-custom text-center px-4">
          <h1 className="mb-6 text-white">Service Audio e Luci</h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto font-semibold leading-relaxed text-gray-300">
            Tecnologia professionale per garantire un audio impeccabile e un'atmosfera luminosa indimenticabile
          </p>
        </div>
      </section>

      {/* Audio Section */}
      <section className="py-12 md:py-16 bg-black">
        <div className="container-custom max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Audio Content */}
            <div>
              <h2 className="mb-6 text-white">Impianto Audio Professionale</h2>
              <div className="space-y-4 text-gray-300">
                <p className="font-medium leading-relaxed">
                  Utilizzo esclusivamente attrezzature audio di livello professionale per garantire una qualità sonora cristallina e potente, adatta a qualsiasi tipo di venue.
                </p>
                <h3 className="text-xl font-bold text-white mt-6 mb-4">Caratteristiche tecniche:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Sistemi line array per una copertura uniforme in tutta la location</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Subwoofer attivi per bassi profondi e controllati</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Mixer digitali di ultima generazione</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Microfoni wireless professionali per cerimonie e discorsi</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Processori audio per un suono ottimizzato</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Audio Image/Icon */}
            <div className="flex items-center justify-center">
              <div className="card bg-gray-800 border-2 border-gray-700 p-8 w-full">
                <div className="w-full h-64 text-accent flex items-center justify-center">
                  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                    {/* Speaker */}
                    <rect x="60" y="20" width="80" height="160" rx="8" strokeWidth="3"/>
                    <circle cx="100" cy="60" r="20" strokeWidth="3"/>
                    <circle cx="100" cy="60" r="15" strokeWidth="2" opacity="0.5"/>
                    <circle cx="100" cy="140" r="35" strokeWidth="3"/>
                    <circle cx="100" cy="140" r="25" strokeWidth="2" opacity="0.5"/>
                    <circle cx="100" cy="140" r="15" strokeWidth="2" opacity="0.3"/>
                    {/* Sound waves */}
                    <path d="M 150 60 Q 165 60 165 75 Q 165 90 150 90" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M 155 60 Q 175 60 175 75 Q 175 90 155 90" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                    <path d="M 50 60 Q 35 60 35 75 Q 35 90 50 90" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M 45 60 Q 25 60 25 75 Q 25 90 45 90" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                  </svg>
                </div>
                <p className="text-center text-gray-300 mt-6 font-semibold">
                  Audio di qualità superiore per ogni momento del tuo evento
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Luci Section */}
      <section className="py-12 md:py-16 bg-gray-900">
        <div className="container-custom max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Luci Image/Icon */}
            <div className="flex items-center justify-center lg:order-1">
              <div className="card bg-gray-800 border-2 border-gray-700 p-8 w-full">
                <div className="w-full h-64 text-accent flex items-center justify-center">
                  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                    {/* Moving head light */}
                    <rect x="70" y="140" width="60" height="20" rx="4" strokeWidth="3"/>
                    <rect x="85" y="120" width="30" height="25" rx="3" strokeWidth="3"/>
                    <path d="M 85 120 L 70 60 L 130 60 L 115 120" strokeWidth="3" fill="currentColor" opacity="0.1"/>
                    <circle cx="100" cy="125" r="8" strokeWidth="2" fill="currentColor"/>
                    {/* Light beams */}
                    <path d="M 100 60 L 70 20" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
                    <path d="M 100 60 L 100 15" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
                    <path d="M 100 60 L 130 20" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
                    {/* Spots */}
                    <circle cx="70" cy="20" r="8" fill="currentColor" opacity="0.3"/>
                    <circle cx="100" cy="15" r="10" fill="currentColor" opacity="0.5"/>
                    <circle cx="130" cy="20" r="8" fill="currentColor" opacity="0.3"/>
                  </svg>
                </div>
                <p className="text-center text-gray-300 mt-6 font-semibold">
                  Effetti luminosi professionali per creare l'atmosfera perfetta
                </p>
              </div>
            </div>

            {/* Luci Content */}
            <div className="lg:order-2">
              <h2 className="mb-6 text-white">Impianto Luci Scenografico</h2>
              <div className="space-y-4 text-gray-300">
                <p className="font-medium leading-relaxed">
                  L'illuminazione è fondamentale per creare l'atmosfera giusta in ogni momento della serata. Utilizzo tecnologia LED e teste mobili per effetti spettacolari.
                </p>
                <h3 className="text-xl font-bold text-white mt-6 mb-4">Caratteristiche tecniche:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Teste mobili LED per effetti dinamici e colorati</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Par LED RGBW per illuminazione d'ambiente</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Strobo e laser per momenti ad alta energia</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Macchine del fumo e nebbia per effetti atmosferici</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="font-medium">Controller DMX per programmazione e sincronizzazione</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personalizzazione */}
      <section className="py-12 md:py-16 bg-black">
        <div className="container-custom max-w-4xl px-4 text-center">
          <h2 className="mb-6 text-white">Setup Personalizzato</h2>
          <p className="text-lg text-gray-300 mb-8 leading-relaxed font-medium">
            Ogni evento è unico e richiede un setup audio/luci su misura. Prima dell'evento effettuo sempre un sopralluogo per valutare gli spazi e progettare la configurazione ottimale.
          </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="card bg-gray-800 border-2 border-gray-700 p-4">
              <div className="w-10 h-10 text-accent mx-auto mb-3">
                {/* Icona Sopralluogo - Occhio che osserva */}
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <ellipse cx="32" cy="32" rx="24" ry="16" strokeLinejoin="round"/>
                  <circle cx="32" cy="32" r="10" strokeWidth="2.5"/>
                  <circle cx="32" cy="32" r="5" fill="currentColor"/>
                  <path d="M8 32C8 32 16 20 32 20C48 20 56 32 56 32" strokeLinecap="round" strokeWidth="2" opacity="0.3"/>
                </svg>
              </div>
              <h3 className="font-display font-semibold text-white mb-1 leading-tight px-1" style={{fontSize: '0.65rem', letterSpacing: '0.01em'}}>Sopralluogo</h3>
              <p className="text-[8px] text-gray-400 font-medium leading-tight">
                Analisi
              </p>
            </div>
            <div className="card bg-gray-800 border-2 border-gray-700 p-4">
              <div className="w-10 h-10 text-accent mx-auto mb-3">
                {/* Icona Progettazione - Matita su documento */}
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="14" y="12" width="30" height="40" rx="2" strokeLinejoin="round"/>
                  <path d="M20 20h18M20 26h14M20 32h18M20 38h12" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                  <path d="M42 28L38 32L42 36L46 32L42 28Z" fill="currentColor" opacity="0.8"/>
                  <path d="M38 32L32 38L32 42L36 42L42 36" strokeLinejoin="round" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="font-display font-semibold text-white mb-1 leading-tight px-1" style={{fontSize: '0.65rem', letterSpacing: '0.01em'}}>Progettazione</h3>
              <p className="text-[8px] text-gray-400 font-medium leading-tight">
                Setup
              </p>
            </div>
            <div className="card bg-gray-800 border-2 border-gray-700 p-4">
              <div className="w-10 h-10 text-accent mx-auto mb-3">
                {/* Icona Installazione - Strumenti (chiave inglese + cacciavite) */}
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 22L22 28L38 12L32 6L16 22Z" strokeLinejoin="round" fill="currentColor" opacity="0.2"/>
                  <path d="M16 22L22 28L38 12L32 6L16 22Z" strokeLinejoin="round"/>
                  <circle cx="20" cy="24" r="2" fill="currentColor"/>
                  <path d="M48 32L42 38L48 44L54 38L48 32Z" strokeLinejoin="round" fill="currentColor" opacity="0.2"/>
                  <path d="M48 32L42 38L48 44L54 38L48 32Z" strokeLinejoin="round"/>
                  <rect x="46" y="50" width="4" height="8" rx="1" fill="currentColor" opacity="0.6"/>
                </svg>
              </div>
              <h3 className="font-display font-semibold text-white mb-1 leading-tight px-1" style={{fontSize: '0.65rem', letterSpacing: '0.01em'}}>Installazione</h3>
              <p className="text-[8px] text-gray-400 font-medium leading-tight">
                Montaggio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-gray-900 to-black">
        <div className="container-custom max-w-3xl px-4 text-center">
          <h2 className="font-display mb-4 md:mb-6 text-white">Vuoi saperne di più?</h2>
          <p className="font-sans text-gray-400 mb-8 md:mb-10 leading-relaxed">
            Contattami per discutere delle esigenze audio/luci del tuo evento e ricevere un preventivo personalizzato.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
            <Link
              href="/contatti"
              className="font-sans inline-block w-full sm:w-auto bg-gradient-to-r from-accent to-blue-600 hover:from-blue-600 hover:to-accent text-white px-10 md:px-12 py-4 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Richiedi informazioni
            </Link>
            <a
              href="https://wa.me/393462122933"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans inline-block w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-10 md:px-12 py-4 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Scrivimi su WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

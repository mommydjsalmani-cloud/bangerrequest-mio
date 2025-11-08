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
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="32" cy="32" r="20" strokeWidth="2.5"/>
                  <circle cx="32" cy="32" r="3" fill="currentColor"/>
                  <path d="M32 32L45 19" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1 normal-case">Sopralluogo</h3>
              <p className="text-[10px] text-gray-400 font-medium leading-tight">
                Analisi spazi
              </p>
            </div>
            <div className="card bg-gray-800 border-2 border-gray-700 p-4">
              <div className="w-10 h-10 text-accent mx-auto mb-3">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="16" y="20" width="32" height="24" rx="2" strokeWidth="2.5"/>
                  <path d="M24 28h16M24 32h12M24 36h16" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1 normal-case">Progettazione</h3>
              <p className="text-[10px] text-gray-400 font-medium leading-tight">
                Setup su misura
              </p>
            </div>
            <div className="card bg-gray-800 border-2 border-gray-700 p-4">
              <div className="w-10 h-10 text-accent mx-auto mb-3">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 38L28 46L44 30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="32" cy="32" r="20" strokeWidth="2.5"/>
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1 normal-case">Installazione</h3>
              <p className="text-[10px] text-gray-400 font-medium leading-tight">
                Montaggio e test
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-900 to-black">
        <div className="container-custom max-w-3xl px-4 text-center">
          <h2 className="mb-6 text-white">Vuoi saperne di più?</h2>
          <p className="text-lg text-gray-300 mb-8 leading-relaxed font-medium">
            Contattami per discutere delle esigenze audio/luci del tuo evento e ricevere un preventivo personalizzato.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contatti"
              className="font-sans font-semibold px-10 py-4 bg-[#4169e1] text-white rounded-full hover:bg-[#3557c7] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[#4169e1]/50"
            >
              Richiedi informazioni
            </Link>
            <a
              href="https://wa.me/393462122933"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans font-semibold px-10 py-4 border-2 border-white/20 text-white rounded-full hover:border-[#4169e1] hover:text-[#4169e1] transition-all duration-300"
            >
              Scrivimi su WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

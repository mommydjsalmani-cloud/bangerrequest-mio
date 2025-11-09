'use client';

import Link from "next/link";

export default function EventiPrivati() {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="bg-gray-900 border-b border-gray-800 py-3">
        <div className="container-custom">
          <div className="flex items-center gap-2 text-sm text-gray-400 font-sans">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Eventi Privati</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-16 md:py-32 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="container-custom text-center px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 text-accent">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
              {/* Palloncini party */}
              <circle cx="24" cy="28" r="10" strokeWidth="3.5"/>
              <circle cx="40" cy="24" r="10" strokeWidth="3.5"/>
              <circle cx="32" cy="18" r="8" strokeWidth="3.5"/>
              <path d="M24 38L24 52M40 34L40 52M32 26L32 52" strokeLinecap="round"/>
              <path d="M20 52L28 52M36 52L44 52M28 52L36 52" strokeLinecap="round" strokeWidth="3.5"/>
              {/* Coriandoli */}
              <circle cx="14" cy="42" r="1.5" fill="currentColor"/>
              <circle cx="50" cy="38" r="1.5" fill="currentColor"/>
              <circle cx="18" cy="48" r="1.5" fill="currentColor"/>
              <circle cx="46" cy="46" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="mb-4 md:mb-6 text-white font-display">DJ per compleanni, anniversari, aziendali</h1>
          <p className="font-sans text-base md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Trovare il "centro" della festa entro tre brani.<br className="hidden sm:block" />
            <span className="block sm:inline mt-2 sm:mt-0">Poi mantenerlo.</span>
          </p>
        </div>
      </section>

      {/* Format */}
      <section className="py-12 md:py-20 bg-gray-900">
        <div className="container-custom px-4">
          <h2 className="font-display text-center mb-8 md:mb-16 text-white">Formato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl">
              <div className="w-12 h-12 text-accent mb-4">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                  {/* Torta compleanno */}
                  <rect x="16" y="32" width="32" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="20" y="24" width="24" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                  {/* Candeline */}
                  <line x1="24" y1="24" x2="24" y2="18" strokeLinecap="round"/>
                  <line x1="32" y1="24" x2="32" y2="16" strokeLinecap="round"/>
                  <line x1="40" y1="24" x2="40" y2="18" strokeLinecap="round"/>
                  {/* Fiamme */}
                  <path d="M24 18C24 18 22 16 24 14" strokeLinecap="round"/>
                  <path d="M32 16C32 16 30 14 32 12" strokeLinecap="round"/>
                  <path d="M40 18C40 18 38 16 40 14" strokeLinecap="round"/>
                  {/* Decorazioni */}
                  <path d="M20 40H44M22 36H42" strokeLinecap="round" opacity="0.3"/>
                </svg>
              </div>
              <h3 className="font-display text-white mb-4">18/30/40 e anniversari</h3>
              <p className="font-sans text-gray-400 leading-relaxed">Set flessibile, momenti parlati chiari.</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl">
              <div className="w-12 h-12 text-accent mb-4">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                  {/* Edificio aziendale */}
                  <rect x="16" y="12" width="32" height="40" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M24 12V8H40V12" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Finestre */}
                  <rect x="22" y="20" width="6" height="6" rx="0.5"/>
                  <rect x="36" y="20" width="6" height="6" rx="0.5"/>
                  <rect x="22" y="30" width="6" height="6" rx="0.5"/>
                  <rect x="36" y="30" width="6" height="6" rx="0.5"/>
                  {/* Porta */}
                  <rect x="28" y="42" width="8" height="10" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-display text-white mb-4">Aziendali</h3>
              <p className="font-sans text-gray-400 leading-relaxed">Volumi controllati, finestre speech, transizioni pulite.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cosa porto */}
      <section className="py-20 bg-black">
        <div className="container-custom max-w-4xl">
          <h2 className="font-display text-center mb-12 text-white">Dotazione</h2>
          <div className="bg-gray-900 border border-gray-800 p-8 md:p-10 rounded-2xl">
            <p className="font-sans text-gray-300 leading-relaxed mb-6">
              Consolle, impianto dimensionato, microfoni, luci base.
            </p>
            <div>
              <h3 className="font-display text-white font-semibold mb-3 text-sm">Extra</h3>
              <p className="font-sans text-gray-400 leading-relaxed">
                uplighting, seconda postazione, sax live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Come lavoro */}
      <section className="py-20 bg-gray-900">
        <div className="container-custom max-w-5xl">
          <h2 className="text-center mb-16 text-white uppercase tracking-wider">Come lavoro</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">1</div>
              <h3 className="text-white mb-2 uppercase tracking-wide text-xs">Brief rapido</h3>
              <p className="text-gray-400 text-sm">Capiamo tipo di evento e atmosfera desiderata</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">2</div>
              <h3 className="text-white mb-2 uppercase tracking-wide text-xs">Paletti musicali</h3>
              <p className="text-gray-400 text-sm">Definiamo generi e brani chiave</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">3</div>
              <h3 className="text-white mb-2 uppercase tracking-wide text-xs">Orari definiti</h3>
              <p className="text-gray-400 text-sm">Timeline e timing dell'evento</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">4</div>
              <h3 className="text-white mb-2 uppercase tracking-wide text-xs">Richieste live</h3>
              <p className="text-gray-400 text-sm">Gli ospiti usano la mia app</p>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Section */}
      <section id="corporate" className="py-20 bg-black">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-6 text-accent">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                <rect x="16" y="20" width="32" height="32"/>
                <path d="M16 20L24 12L40 12L48 20" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="22" y="28" width="6" height="6"/>
                <rect x="36" y="28" width="6" height="6"/>
                <rect x="22" y="40" width="6" height="6"/>
                <rect x="36" y="40" width="6" height="6"/>
                <rect x="28" y="46" width="8" height="6"/>
              </svg>
            </div>
            <h2 className="mb-6 text-white uppercase tracking-wider">Eventi Corporate</h2>
            <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Sfilate, presentazioni prodotto, cocktail aziendali. Professionalità, discrezione e adattamento al contesto.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-8 md:p-10 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-white font-semibold mb-4 uppercase tracking-wide text-sm">Tipologie</h3>
                <ul className="text-gray-400 space-y-2 text-sm">
                  <li>• Sfilate moda</li>
                  <li>• Presentazioni prodotto</li>
                  <li>• Cocktail aziendali</li>
                  <li>• Inaugurazioni</li>
                  <li>• Gala e charity</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4 uppercase tracking-wide text-sm">Approccio</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Musica di sottofondo calibrata, nessun elemento invasivo, coordinamento con agenzia/organizzatore, backup sempre previsto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900">
        <div className="container-custom text-center max-w-2xl">
          <h2 className="font-display mb-6 text-white">Chiedi un preventivo</h2>
          <p className="font-sans text-gray-400 mb-10 leading-relaxed">
            Ogni evento è diverso. Raccontami la tua idea e ti preparo una proposta chiara.
          </p>
          <Link
            href="/contatti"
            className="font-sans inline-block bg-accent hover:bg-accent-hover text-white px-12 py-4 rounded-full font-semibold transition-colors uppercase tracking-wider text-sm"
          >
            Contattami ora
          </Link>
        </div>
      </section>
    </div>
  );
}

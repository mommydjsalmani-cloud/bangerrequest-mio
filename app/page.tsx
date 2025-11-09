import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4169e1] rounded-full filter blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4169e1] rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#4169e1] px-2">
            DJ & Music Planner
          </h1>
          <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed px-2">
            Matrimoni | Eventi Privati | Locali | Destination Wedding
          </p>
          <p className="font-sans text-sm sm:text-base md:text-lg text-gray-400 mb-12 max-w-2xl mx-auto px-2">
            Dal 2003 — musica e regia per eventi in Svizzera, Toscana, Lombardia, Emilia Romagna e Veneto
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="#contatti"
              className="font-sans font-bold px-12 py-5 bg-gradient-to-r from-[#4169e1] to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-[#4169e1] transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl uppercase tracking-wide text-sm"
            >
              Verifica disponibilità
            </a>
            <a
              href="#processo"
              className="font-sans font-semibold px-10 py-4 border-2 border-white/20 text-white rounded-full hover:border-[#4169e1] hover:text-[#4169e1] transition-all duration-300"
            >
              Guarda il video di presentazione
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* Cosa Faccio */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4169e1] to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <h3 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-4">
                Matrimonio & Destination Wedding
              </h3>
              <p className="font-sans text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
                Eventi curati nei dettagli, con musica pensata per ogni momento.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-4">
                Eventi Privati & Locali
              </h3>
              <p className="font-sans text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
                Feste, anniversari, corporate e serate live con regia musicale completa.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-4">
                Regia & Collaborazioni
              </h3>
              <p className="font-sans text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
                Gestione e coordinamento di musicisti, performer e cantanti dal vivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Approccio */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white mb-6">
              Approccio
            </h2>
          </div>
          <div className="bg-black/50 border border-[#4169e1]/30 rounded-2xl p-8 md:p-12">
            <div className="space-y-4 text-gray-300">
              <p className="font-sans text-base md:text-lg leading-relaxed">
                Da oltre vent'anni mi occupo di musica e direzione artistica per eventi.
              </p>
              <p className="font-sans text-base md:text-lg leading-relaxed">
                In ogni serata creo un percorso musicale che spazia da house, pop, R&B e hip hop fino ai classici '70–'80 e ai ritmi latini.
              </p>
              <p className="font-sans text-base md:text-lg leading-relaxed">
                Grazie a un'applicazione che ho sviluppato, gli ospiti possono inviare richieste musicali in tempo reale, rendendo ogni evento ancora più personale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Esperienza Internazionale */}
      <section id="esperienza" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-white mb-6 leading-tight">
              Esperienza Internazionale
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-black/50 border border-[#4169e1]/30 rounded-2xl p-8 md:p-12 mb-12">
              <p className="font-sans text-base md:text-lg text-gray-300 leading-relaxed mb-6">
                Ho curato la musica per matrimoni ed eventi con ospiti provenienti da Irlanda, Stati Uniti, India, Australia e molti altri paesi.
              </p>
              <p className="font-sans text-base md:text-lg text-gray-300 leading-relaxed">
                Collaboro spesso con wedding planner e venue internazionali, lavorando in contesti esclusivi in <strong className="text-white">Svizzera, Toscana, Lombardia e Veneto</strong>.
              </p>
            </div>

            {/* Numeri */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-b from-[#4169e1]/10 to-transparent border border-[#4169e1]/30 rounded-2xl p-8 text-center hover:border-[#4169e1] transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#4169e1] mb-4">1000+</div>
                <p className="font-sans text-xs sm:text-sm md:text-base text-gray-300">eventi curati</p>
              </div>

              <div className="bg-gradient-to-b from-[#4169e1]/10 to-transparent border border-[#4169e1]/30 rounded-2xl p-8 text-center hover:border-[#4169e1] transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#4169e1] mb-4">15+</div>
                <p className="font-sans text-xs sm:text-sm md:text-base text-gray-300">destination wedding da oltre 15 nazioni</p>
              </div>

              <div className="bg-gradient-to-b from-[#4169e1]/10 to-transparent border border-[#4169e1]/30 rounded-2xl p-8 text-center hover:border-[#4169e1] transition-all duration-300">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#4169e1] mb-4">Service</div>
                <p className="font-sans text-xs sm:text-sm md:text-base text-gray-300">audio compreso</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section - Rimosso */}

      {/* Recensioni - Rimossa */}

      {/* FAQ - Rimossa */}

      {/* Contact Section */}
      <section id="contatti" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 mb-6 px-4">
              <div className="w-12 h-12 md:w-14 md:h-14 text-accent flex-shrink-0">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <circle cx="32" cy="32" r="20"/>
                  <circle cx="32" cy="32" r="12"/>
                  <path d="M12 32L8 32M56 32L52 32M32 12L32 8M32 56L32 52" strokeLinecap="round"/>
                  <path d="M18 18L14 14M46 18L50 14M18 46L14 50M46 46L50 50" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center">
                Vuoi sapere se sono disponibile per il tuo evento?
              </h2>
            </div>
          </div>

          <div className="bg-black/50 border border-[#4169e1]/30 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <a
                href="#contatti"
                className="font-sans font-semibold px-10 py-4 bg-[#4169e1] text-white rounded-full hover:bg-[#3557c7] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[#4169e1]/50 text-center"
              >
                Richiedi informazioni
              </a>
              <a
                href="https://wa.me/393123456789"
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans font-semibold px-10 py-4 border-2 border-[#4169e1] text-[#4169e1] rounded-full hover:bg-[#4169e1] hover:text-white transition-all duration-300 text-center"
              >
                Invia richiesta WhatsApp
              </a>
            </div>

            <div className="space-y-6 pt-8 border-t border-gray-800">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#4169e1] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-white mb-2">Email</h3>
                  <a href="mailto:info@mommydj.com" className="font-sans text-[#4169e1] hover:underline text-lg">
                    info@mommydj.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#4169e1] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-white mb-2">WhatsApp</h3>
                  <a href="https://wa.me/393462122933" className="font-sans text-[#4169e1] hover:underline text-lg">
                    +39 346 212 2933
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#4169e1] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl text-white mb-2">Zona di Copertura</h3>
                  <p className="font-sans text-gray-300 text-lg">Italia Nord · Ticino · Canton Vallese</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

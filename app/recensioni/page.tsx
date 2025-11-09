'use client';

import Link from "next/link";

export default function Recensioni() {
  const reviews = [
    {
      name: "Maria & Luca",
      event: "Matrimonio",
      location: "Milano",
      year: "2024",
      rating: 5,
      text: "Professionale, attento e con un gusto musicale perfetto. Ha capito esattamente cosa volevamo e tutti i nostri ospiti hanno ballato dall'inizio alla fine. Consigliatissimo!",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><circle cx="24" cy="22" r="8"/><circle cx="40" cy="22" r="8"/><path d="M24 30C24 30 28 38 32 38C36 38 40 30 40 30" strokeLinecap="round"/><path d="M20 18L18 16M44 18L46 16" strokeLinecap="round"/></svg>
    },
    {
      name: "Giulia R.",
      event: "30° Compleanno",
      location: "Roma",
      year: "2024",
      rating: 5,
      text: "Ha reso la mia festa indimenticabile! La call preliminare è stata utilissima per capire i miei gusti. La playlist era perfetta e l'atmosfera fantastica.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M18 24L22 16L26 24L34 24L38 16L42 24L50 24" strokeLinecap="round"/><path d="M16 24L16 28C16 36 20 44 32 44C44 44 48 36 48 28V24" strokeLinecap="round"/><circle cx="24" cy="32" r="2" fill="currentColor"/><circle cx="40" cy="32" r="2" fill="currentColor"/><path d="M28 38C28 38 30 40 32 40C34 40 36 38 36 38" strokeLinecap="round"/></svg>
    },
    {
      name: "Marco S.",
      event: "Matrimonio",
      location: "Firenze",
      year: "2023",
      rating: 5,
      text: "Consigliatissimo! Musica sempre azzeccata, attenzione ai dettagli e grande professionalità. Il nostro matrimonio è stato perfetto anche grazie a lui.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="12"/><path d="M32 14L36 10M32 14L28 10" strokeLinecap="round"/></svg>
    },
    {
      name: "Francesca B.",
      event: "Evento Aziendale",
      location: "Bologna",
      year: "2024",
      rating: 5,
      text: "Abbiamo organizzato la festa aziendale di fine anno e siamo stati molto soddisfatti. Discreto, professionale e con ottimo gusto musicale.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><rect x="16" y="20" width="32" height="32"/><path d="M16 20L24 12L40 12L48 20" strokeLinecap="round" strokeLinejoin="round"/><rect x="22" y="28" width="6" height="6"/><rect x="36" y="28" width="6" height="6"/><rect x="22" y="40" width="6" height="6"/><rect x="36" y="40" width="6" height="6"/><rect x="28" y="46" width="8" height="6"/></svg>
    },
    {
      name: "Alessandro & Sofia",
      event: "Matrimonio",
      location: "Verona",
      year: "2024",
      rating: 5,
      text: "La musica perfetta per ogni momento della giornata. Dalla cerimonia al party finale, tutto è filato liscio. Grazie di cuore!",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M32 16L28 12L32 8L36 12L32 16Z" strokeLinecap="round" strokeLinejoin="round"/><rect x="24" y="16" width="16" height="12"/><path d="M20 28L44 28L44 52L20 52L20 28Z" strokeLinecap="round" strokeLinejoin="round"/><path d="M28 52L28 38L36 38L36 52" strokeLinecap="round"/><circle cx="28" cy="22" r="1" fill="currentColor"/><circle cx="36" cy="22" r="1" fill="currentColor"/></svg>
    },
    {
      name: "Chiara M.",
      event: "18° Compleanno",
      location: "Torino",
      year: "2023",
      rating: 5,
      text: "La mia festa è stata epica! Ha fatto ballare tutti, dai miei amici ai miei genitori. Playlist super aggiornata e mix perfetti.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><ellipse cx="32" cy="42" rx="16" ry="10"/><ellipse cx="32" cy="34" rx="14" ry="8"/><ellipse cx="32" cy="28" rx="10" ry="6"/><path d="M26 28L26 20M32 28L32 18M38 28L38 20" strokeLinecap="round"/><path d="M26 20L26 16L27 14M32 18L32 14L33 12M38 20L38 16L39 14" strokeLinecap="round"/></svg>
    },
    {
      name: "Roberto & Anna",
      event: "25° Anniversario",
      location: "Napoli",
      year: "2024",
      rating: 5,
      text: "Abbiamo celebrato le nostre nozze d'argento con una festa bellissima. La musica ha creato l'atmosfera perfetta per questa serata speciale.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M20 36L20 44L26 48L32 44L38 48L44 44L44 36" strokeLinecap="round" strokeLinejoin="round"/><ellipse cx="32" cy="28" rx="12" ry="8"/><path d="M32 20L32 12M28 14L32 12L36 14" strokeLinecap="round"/><circle cx="28" cy="28" r="1" fill="currentColor"/><circle cx="36" cy="28" r="1" fill="currentColor"/></svg>
    },
    {
      name: "Matteo P.",
      event: "40° Compleanno",
      location: "Genova",
      year: "2023",
      rating: 5,
      text: "Festa perfetta! Mix generazionale fantastico che ha fatto ballare tutti gli ospiti. Professionale e simpatico.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M18 16L22 24L26 16M32 16L36 24L40 16M46 16L50 24L54 16" strokeLinecap="round"/><circle cx="20" cy="32" r="3"/><path d="M20 35L18 48" strokeLinecap="round"/><circle cx="36" cy="28" r="3"/><path d="M36 31L34 44" strokeLinecap="round"/><circle cx="52" cy="34" r="3"/><path d="M52 37L50 50" strokeLinecap="round"/><circle cx="24" cy="44" r="1" fill="currentColor"/><circle cx="28" cy="42" r="1" fill="currentColor"/><circle cx="40" cy="38" r="1" fill="currentColor"/><circle cx="44" cy="40" r="1" fill="currentColor"/></svg>
    },
    {
      name: "Laura & Davide",
      event: "Matrimonio",
      location: "Brescia",
      year: "2024",
      rating: 5,
      text: "Il migliore! Ha saputo creare la giusta atmosfera in ogni momento. I nostri ospiti ci chiedono ancora il suo contatto!",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M32 48C32 48 20 38 20 28C20 22 24 18 28 18C30 18 32 20 32 20C32 20 34 18 36 18C40 18 44 22 44 28C44 38 32 48 32 48Z" strokeLinejoin="round"/></svg>
    },
    {
      name: "Sara T.",
      event: "30° Compleanno",
      location: "Padova",
      year: "2024",
      rating: 5,
      text: "Organizzazione impeccabile e musica fantastica. La festa è stata un successo totale grazie anche a lui!",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><circle cx="20" cy="28" r="4"/><path d="M20 32L18 46" strokeLinecap="round"/><circle cx="36" cy="24" r="4"/><path d="M36 28L34 42" strokeLinecap="round"/><circle cx="52" cy="30" r="4"/><path d="M52 34L50 48" strokeLinecap="round"/><path d="M14 12L18 20L22 12M30 12L34 20L38 12M46 12L50 20L54 12" strokeLinecap="round"/><circle cx="16" cy="38" r="1.5" fill="currentColor"/><circle cx="24" cy="36" r="1.5" fill="currentColor"/><circle cx="40" cy="34" r="1.5" fill="currentColor"/><circle cx="46" cy="40" r="1.5" fill="currentColor"/></svg>
    },
    {
      name: "Giuseppe & Elena",
      event: "Matrimonio",
      location: "Palermo",
      year: "2023",
      rating: 5,
      text: "Consigliato dalla nostra wedding planner e confermo: è bravissimo! Musica perfetta e grande professionalità.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><circle cx="32" cy="20" r="6"/><path d="M32 26L32 34" strokeLinecap="round"/><path d="M20 34L44 34L42 52L22 52L20 34Z" strokeLinejoin="round"/><path d="M26 38L26 52M32 38L32 52M38 38L38 52" strokeLinecap="round"/><path d="M28 14L32 10L36 14" strokeLinecap="round"/></svg>
    },
    {
      name: "Federica L.",
      event: "Evento Aziendale",
      location: "Milano",
      year: "2024",
      rating: 5,
      text: "Team building perfettamente riuscito. Ha saputo adattarsi al nostro pubblico corporate mantenendo alto il livello di divertimento.",
      icon: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-full h-full"><path d="M32 12L36 20L44 22L38 28L40 36L32 32L24 36L26 28L20 22L28 20L32 12Z" strokeLinejoin="round"/><circle cx="32" cy="26" r="6"/></svg>
    }
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-gray-50 py-3">
        <div className="container-custom">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-600 hover:text-accent">Home</Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium" aria-current="page">Recensioni</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container-custom text-center px-4">
          <h1 className="mb-4 md:mb-6">Recensioni</h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            La soddisfazione dei miei clienti è la mia migliore pubblicità. Ecco cosa dicono di me.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container-custom px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">500+</div>
              <div className="text-gray-600 text-sm">Eventi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">10+</div>
              <div className="text-gray-600 text-sm">Anni Esperienza</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">98%</div>
              <div className="text-gray-600 text-sm">Clienti Soddisfatti</div>
            </div>
            <div className="text-center">
              <div className="flex gap-1 justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-400">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                ))}
              </div>
              <div className="text-gray-600 text-sm">Rating Medio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container-custom px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {reviews.map((review, index) => (
              <div key={index} className="card bg-white p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 text-accent flex-shrink-0">{review.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{review.name}</h3>
                    <p className="text-sm text-gray-600">{review.event}</p>
                    <p className="text-xs text-gray-500">{review.location}, {review.year}</p>
                  </div>
                </div>
                
                <div className="flex mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                
                <p className="text-gray-700 text-sm italic">&quot;{review.text}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Support Note */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <div className="w-6 h-6 text-accent flex-shrink-0">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5">
                <rect x="12" y="16" width="40" height="32" rx="2"/>
                <circle cx="32" cy="32" r="8"/>
                <circle cx="32" cy="32" r="4"/>
                <path d="M12 22L20 14L28 22" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>
              Tutte le recensioni sono verificate. Su richiesta posso fornire screenshot delle recensioni originali.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-accent text-white">
        <div className="container-custom text-center">
          <h2 className="mb-6">Vuoi essere il prossimo cliente soddisfatto?</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Contattami per il tuo evento e verifica la disponibilità.
          </p>
          <a
            href="#main-content"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/#contatto-rapido';
            }}
            className="inline-block bg-white text-accent hover:bg-gray-100 px-8 py-4 rounded-full font-semibold transition-colors"
          >
            Richiedi disponibilità
          </a>
        </div>
      </section>
    </div>
  );
}

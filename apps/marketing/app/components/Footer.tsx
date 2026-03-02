import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-12 border-t border-gray-700">
      <div className="container-custom px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Mommy DJ</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Musica su misura per matrimoni ed eventi privati.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Link Utili</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/matrimoni" className="text-gray-400 hover:text-accent transition-colors text-sm">
                  Matrimoni
                </Link>
              </li>
              <li>
                <Link href="/eventi-privati" className="text-gray-400 hover:text-accent transition-colors text-sm">
                  Eventi Privati
                </Link>
              </li>
              {/* <li>
                <Link href="/recensioni" className="text-gray-400 hover:text-accent transition-colors text-sm">
                  Recensioni
                </Link>
              </li> */}
              <li>
                <Link href="/contatti" className="text-gray-400 hover:text-accent transition-colors text-sm">
                  Contatti
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Contatti</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Email: info@mommydj.com</li>
              <li>Tel: +39 346 212 2933</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {currentYear} Mommy DJ. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}

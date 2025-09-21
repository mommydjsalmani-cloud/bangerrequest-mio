import Link from "next/link";

export default function Instagram() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white p-6">
      <div className="max-w-md w-full bg-zinc-900 rounded-xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Seguimi su Instagram</h1>
        <p className="mb-4">Grazie per voler seguire! Clicca il pulsante per aprire Instagram.</p>
        <a
          href="#"
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded inline-block"
        >
          Apri Instagram
        </a>
        <div className="mt-6 text-sm text-gray-400">
          Se stai usando un dispositivo mobile, il link aprirà l'app Instagram (se installata).
        </div>
        <div className="mt-6">
          <Link href="/" className="underline text-sm">Torna alla Home</Link>
        </div>
      </div>
    </main>
  );
}

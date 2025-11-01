export default function RichiedePage() {
  return (
    <div className="fixed inset-0 w-full h-full">
      <iframe
        src="https://bangerrequest-mio.vercel.app/richiedi"
        className="w-full h-full border-0"
        title="Richiedi Canzone"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="eager"
      />
    </div>
  );
}

import ReplayViewer from "@/app/components/ReplayViewer";

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="live-viewer">
      <header className="scoreboard">
        <h1>Scoreboard</h1>
        <span>Game #{id}</span>
      </header>
      <ReplayViewer gameId={id} />
    </div>
  );
}

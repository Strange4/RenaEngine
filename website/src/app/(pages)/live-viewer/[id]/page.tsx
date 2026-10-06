import LiveViewer from "@/app/components/LiveViewer";

export default async function LiveViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="live-viewer">
      <header className="scoreboard">
        <h1>Scoreboard</h1>
        <span>Game #{id}</span>
      </header>
      <LiveViewer />
    </div>
  );
}

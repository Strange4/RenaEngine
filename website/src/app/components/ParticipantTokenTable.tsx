// AI contribution: Below 50% AI-generated
export default function ParticipantTokenTable({
  participantIds,
}: {
  participantIds: readonly number[];
}) {
  if (participantIds.length === 0) {
    return <p>No participant tokens have been created yet.</p>;
  }

  const rows = [...participantIds].sort((a, b) => a - b);

  return (
    <div className="token-table-wrapper">
      <table className="token-table">
        <caption>Participant tokens</caption>
        <thead>
          <tr>
            <th scope="col">Participant</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((participantId) => (
            <tr key={participantId}>
              <th scope="row">#{participantId}</th>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cover the whole page with a spinner and a short status message.
// Use it while a session check or a login/logout redirect is in progress.
export default function LoadingScreen({
  message = "Verifying your session…",
}: {
  message?: string;
}) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p className="loading-message">{message}</p>
    </div>
  );
}

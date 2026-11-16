import LogoutButton from "./LogoutButton";
import styles from "./AppTopBar.module.css";

// Gradient top bar shown on dashboard pages. Displays the user's label
// (e.g. team name or role) alongside a logout button.
export default function AppTopBar({ label }: { label: string }) {
  return (
    <header className={styles.topbar}>
      <span className={styles.team}>{label}</span>
      <LogoutButton />
    </header>
  );
}

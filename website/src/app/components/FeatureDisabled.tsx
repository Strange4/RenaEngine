import Link from "next/link";

export default function FeatureDisabled({
  returnPath = "/participant",
}: {
  returnPath?: string;
}) {
  return (
    <main>
      <h1>Feature Disabled</h1>
      <p>This feature is not currently available to participants.</p>
      <Link href={returnPath}>Return to participant home</Link>
    </main>
  );
}

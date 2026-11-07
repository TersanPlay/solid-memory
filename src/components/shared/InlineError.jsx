export default function InlineError({ error }) {
  if (!error) return null;
  return (
    <div className="inline-error" role="alert">
      <CircleHelp />
      <span>{error}</span>
    </div>
  );
}

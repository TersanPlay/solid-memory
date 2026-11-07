export default function Eyebrow({ children, tone = "" }) {
  return (
    <span className={`eyebrow ${tone}`}>
      <span className="eyebrow-dot" />
      {children}
    </span>
  );
}

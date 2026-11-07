export default function LoadingState({ text = "Carregando informações…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner dark" />
      {text}
    </div>
  );
}

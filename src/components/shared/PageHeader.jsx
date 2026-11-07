import Eyebrow from "./Eyebrow";
export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header wrap reveal-now">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export { PageHeader };

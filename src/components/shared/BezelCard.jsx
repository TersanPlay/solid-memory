export default function BezelCard({ children, className = "", as: Tag = "div" }) {
  return (
    <Tag className={`bezel ${className}`}>
      <div className="bezel-core">{children}</div>
    </Tag>
  );
}

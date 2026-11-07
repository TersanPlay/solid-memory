import { ArrowUpRight } from "lucide-react";

export default function PrimaryButton({
  children,
  icon = <ArrowUpRight />,
  className = "",
  ...props
}) {
  return (
    <button className={`primary-button ${className}`} {...props}>
      <span>{children}</span>
      <span className="button-icon">{icon}</span>
    </button>
  );
}
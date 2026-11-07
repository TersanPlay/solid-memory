import { useNavigate } from "react-router";

export function useSafeNavigation() {
  const navigate = useNavigate();
  const goTo = (path, options) => navigate(path, options);
  const goBack = () => navigate(-1);
  return { navigate: goTo, goBack };
}

export function safeInternalPath(value, fallback = "/inicio") {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value !== "/login"
  ) {
    return value;
  }
  return fallback;
}

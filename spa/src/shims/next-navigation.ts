import { useLocation, useNavigate } from "react-router-dom";

/** `usePathname` shim used by the shared marketing components. */
export function usePathname(): string {
  return useLocation().pathname;
}

/** `useSearchParams` shim. */
export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(useLocation().search);
}

/** Small `useRouter` shim for components that navigate imperatively. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

import { Link, useLocation } from "react-router";
import { isNavItemActive, type NavItem } from "./navItems";

type NavVariant = "side" | "bottom";

const ITEM_CLASSES: Record<NavVariant, string> = {
  side: "side-nav__item",
  bottom: "bottom-nav__item",
};

function NavEntry({ item, variant }: { item: NavItem; variant: NavVariant }) {
  const { pathname } = useLocation();
  const Icon = item.icon;
  const active = isNavItemActive(item, pathname);

  return (
    <Link
      to={item.to}
      className={ITEM_CLASSES[variant]}
      aria-current={active ? "page" : undefined}
    >
      <span className="nav-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="nav-label">
        {variant === "bottom" ? item.label : item.title}
      </span>
    </Link>
  );
}

export function SideNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="side-nav" aria-label="Secciones">
      {items.map((item) => (
        <NavEntry key={item.to} item={item} variant="side" />
      ))}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="bottom-nav" aria-label="Secciones">
      {items.map((item) => (
        <NavEntry key={item.to} item={item} variant="bottom" />
      ))}
    </nav>
  );
}

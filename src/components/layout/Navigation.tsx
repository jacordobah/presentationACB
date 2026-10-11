import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useNotifications } from "../../notifications/NotificationsContext";
import { Sheet } from "../Sheet";
import { isNavItemActive, type NavItem } from "./navItems";

type NavVariant = "side" | "bottom" | "more";

const ITEM_CLASSES: Record<NavVariant, string> = {
  side: "side-nav__item",
  bottom: "bottom-nav__item",
  more: "more-menu__item",
};

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="nav-badge">
      {count > 99 ? "99+" : count}
      <span className="visually-hidden"> nuevas</span>
    </span>
  );
}

function NavEntry({
  item,
  variant,
  onNavigate,
}: {
  item: NavItem;
  variant: NavVariant;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { badges, clearBadge } = useNotifications();
  const Icon = item.icon;
  const active = isNavItemActive(item, pathname);

  return (
    <Link
      to={item.to}
      className={ITEM_CLASSES[variant]}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        if (item.badge) clearBadge(item.badge);
        onNavigate?.();
      }}
    >
      <span className="nav-icon">
        <Icon size={24} aria-hidden="true" />
        {item.badge && <Badge count={badges[item.badge]} />}
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
  const { pathname } = useLocation();
  const { badges } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.filter((item) => !item.inMore);
  const more = items.filter((item) => item.inMore);
  const moreActive = more.some((item) => isNavItemActive(item, pathname));
  const moreBadge = more.reduce(
    (total, item) => total + (item.badge ? badges[item.badge] : 0),
    0,
  );

  return (
    <nav className="bottom-nav" aria-label="Secciones">
      {primary.map((item) => (
        <NavEntry key={item.to} item={item} variant="bottom" />
      ))}
      {more.length > 0 && (
        <button
          type="button"
          className="bottom-nav__item"
          aria-current={moreActive ? "page" : undefined}
          aria-haspopup="dialog"
          onClick={() => setMoreOpen(true)}
        >
          <span className="nav-icon">
            <Ellipsis size={24} aria-hidden="true" />
            <Badge count={moreBadge} />
          </span>
          <span className="nav-label">Más</span>
        </button>
      )}
      <Sheet
        open={moreOpen}
        title="Más secciones"
        onClose={() => setMoreOpen(false)}
      >
        <div className="more-menu">
          {more.map((item) => (
            <NavEntry
              key={item.to}
              item={item}
              variant="more"
              onNavigate={() => setMoreOpen(false)}
            />
          ))}
        </div>
      </Sheet>
    </nav>
  );
}

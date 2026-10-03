/** Counted scroll lock, so a menu and the drawer can overlap without fighting. */
let locks = 0;

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (locks++ === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    if (gap > 0) document.documentElement.style.paddingRight = `${gap}px`;
  }
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.documentElement.style.overflow = "";
    document.documentElement.style.paddingRight = "";
  }
}

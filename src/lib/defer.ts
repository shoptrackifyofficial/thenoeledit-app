/**
 * Runs `fn` once the page is idle — after `load`, then on the first idle slot.
 * Analytics and smooth-scrolling are not part of first paint, and evaluating
 * their bundles inside the load window is what shows up in Lighthouse as
 * "Minimize main-thread work" / Total Blocking Time. Deferring moves that
 * evaluation past the point where it can block interaction.
 *
 * Returns a cancel function, so effects can clean up if they unmount first.
 */
export function onIdle(fn: () => void, timeout = 3000): () => void {
  if (typeof window === "undefined") return () => {};

  let idleId: number | undefined;
  let cancelled = false;

  const schedule = () => {
    if (cancelled) return;
    const ric = window.requestIdleCallback;
    if (ric) {
      idleId = ric(() => !cancelled && fn(), { timeout });
    } else {
      idleId = window.setTimeout(() => !cancelled && fn(), 1);
    }
  };

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleId === undefined) return;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
    else window.clearTimeout(idleId);
  };
}

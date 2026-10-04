/**
 * Start a muted autoplay that survives the ways browsers quietly refuse one.
 *
 *  - React sets `muted` as a property, never as the attribute, and iOS Safari
 *    and some Android WebViews decide autoplay eligibility from the attribute —
 *    so both are set here (`defaultMuted` is the attribute), along with
 *    `playsinline` so iOS never hijacks the clip into fullscreen.
 *  - A `play()` that is rejected (Low Power Mode, data saver, a clip that was
 *    not buffered yet) is retried once data arrives and once more on the
 *    visitor's first touch/click, which lifts those restrictions.
 *
 * `shouldPlay` is checked before every attempt so a retry never starts a clip
 * the visitor has already left. Returns a cleanup that drops the retries.
 */
export function playMuted(el: HTMLVideoElement, shouldPlay: () => boolean): () => void {
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute("playsinline", "");

  const attempt = () => {
    if (!shouldPlay() || !el.paused) return;
    el.play().catch(() => {});
  };

  const onGesture = () => {
    cleanup();
    attempt();
  };
  const cleanup = () => {
    el.removeEventListener("canplay", attempt);
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("touchstart", onGesture);
    window.removeEventListener("keydown", onGesture);
  };

  el.addEventListener("canplay", attempt, { once: true });
  window.addEventListener("pointerdown", onGesture, { once: true, passive: true });
  window.addEventListener("touchstart", onGesture, { once: true, passive: true });
  window.addEventListener("keydown", onGesture, { once: true, passive: true });

  attempt();
  return cleanup;
}

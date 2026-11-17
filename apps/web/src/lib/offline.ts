let registered = false;

export function keepAppOffline(): void {
  if (registered || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  registered = true;
  const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  const whenIdle = () => ("requestIdleCallback" in window ? window.requestIdleCallback(register, { timeout: 5000 }) : setTimeout(register, 2000));
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

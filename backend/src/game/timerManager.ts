const lobbyTimers = new Map<string, Set<NodeJS.Timeout>>();

export function setLobbyTimeout(
  code: string,
  fn: () => void,
  delay: number
): NodeJS.Timeout {
  const timer = setTimeout(() => {
    const timers = lobbyTimers.get(code);
    if (timers) timers.delete(timer);
    fn();
  }, delay);

  if (!lobbyTimers.has(code)) {
    lobbyTimers.set(code, new Set());
  }
  lobbyTimers.get(code)!.add(timer);
  return timer;
}

export function clearLobbyTimers(code: string): void {
  const timers = lobbyTimers.get(code);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    lobbyTimers.delete(code);
  }
}

export function demoContentEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_DEMO_CONTENT === "true";
}

export function demoSeed<T>(items: T[]): T[] {
  return demoContentEnabled() ? [...items] : [];
}

export interface EventPage { events: unknown[]; cursor: number }
export function mergePage(prev: EventPage, page: EventPage): EventPage {
  if (page.cursor <= prev.cursor) return prev;
  return { events: [...prev.events, ...page.events], cursor: page.cursor };
}

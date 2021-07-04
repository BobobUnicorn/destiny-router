/** Event name to use to tell the router to navigate. */
export const NAVIGATE = "router_navigate";

/** Event details to use to tell the router to navigate. */
export interface NavigateEventDetail {
  go: string[] | string;
}

/** A class that helps with type inference for Router events. */
export const RouterEvent = CustomEvent as {
  prototype: CustomEvent;
  new (
    event: typeof NAVIGATE,
    eventInitDict?: CustomEventInit<NavigateEventDetail>
  ): CustomEvent<NavigateEventDetail>;
  new <T>(event: string, eventInitDict?: CustomEventInit<T>): CustomEvent<T>;
};

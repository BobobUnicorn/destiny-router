import {
  Component,
  computed,
  reactive,
  ReactiveValue,
  TemplateResult,
  xml,
} from "destiny";
import { NAVIGATE, NavigateEventDetail } from "./events";
import type { Route, Routes } from "./types";

function getRoutePath(url: string) {
  return new URL(url).pathname;
}

const currentPath = reactive(getRoutePath(window.location.href));

window.addEventListener("popstate", (e) => {
  const state = e.state;
  setRoute(state || window.location.href);
});

function setRoute(path: string) {
  currentPath.value = getRoutePath(path);
}

function isSameDomain(href: string) {
  return (
    new URL(href, window.location.href).hostname ===
    new URL(window.location.href).hostname
  );
}

function pushState(path: string) {
  const url = new URL(path, window.location.href).toString();
  history.pushState(url, "", url);
}

function replaceState(path: string) {
  const url = new URL(path, window.location.href).toString();
  history.replaceState(url, "", url);
}

export interface RouterComponent {
  addEventListener(
    type: typeof NAVIGATE,
    listener: (this: this, ev: CustomEvent<NavigateEventDetail>) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export class RouterComponent extends Component {
  #errorTemplate = new ReactiveValue(xml`404`);
  #routes = new ReactiveValue<Routes>([]);
  #template = computed(() => {
    let path = currentPath.value;

    let route: Route | null;

    for (let i = 0; i < 10; i++) {
      route = this.#matchRoute(path);

      if (!route) {
        return this.#errorTemplate.value;
      } else if (route.redirectTo) {
        path = route.redirectTo;
        replaceState(path);
      } else {
        return this.#getRouteTemplate(route);
      }
    }

    throw new Error(`Too many redirects encountered for ${currentPath.value}.`);
  });

  set routes(routes: Routes) {
    this.#routes.value = normalizeRoutePaths(routes);
  }

  set errorTemplate(errorTemplate: TemplateResult) {
    this.#errorTemplate.value = errorTemplate;
  }

  constructor() {
    super();

    // Handle explicit NAVIGATE events, triggered from JS.
    this.addEventListener(NAVIGATE, (e) => {
      const go = e.detail.go;
      let path: string;
      if (Array.isArray(go)) {
        path = go.join("/");
      } else {
        path = go;
      }

      pushState(path);
      currentPath.value = path;

      e.stopPropagation();
    });

    // Trap anchor link clicks, so that they are actually handled through the router.
    this.addEventListener("click", (e) => {
      const target = e.composedPath()[0];
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }

      if (!isSameDomain(target.href)) {
        return;
      }

      const url = new URL(target.href, window.location.href);
      const extractedPath = url.pathname;
      pushState(extractedPath);
      currentPath.value = extractedPath;

      e.preventDefault();
      e.stopPropagation();
    });
  }

  #matchRoute(path: string, routes: Routes = this.#routes.value): Route | null {
    path = normalizePath(path);
    for (const route of routes) {
      const routePath = route.path;
      if (routePath === "" && path !== routePath) {
        continue;
      }
      if (path.startsWith(routePath)) {
        if (route.children?.length) {
          return this.#matchRoute(
            path.slice(route.path.length),
            route.children
          );
        } else {
          return route;
        }
      }
    }
    return null;
  }

  #getRouteTemplate(route: Route) {
    if (route.template) {
      // TODO: add route parsing
      return route.template({});
    } else {
      throw new Error(
        `The provided route \`${route.path}\` does not have a registered component.`
      );
    }
  }

  template = this.#template;
}

function normalizeRoutePaths(routes: Routes): Routes {
  const processedRoutes: Route[] = [];

  for (const route of routes) {
    const processedRoute: Route = {
      ...route,
      path: normalizePath(route.path),
      children: route.children && normalizeRoutePaths(route.children),
    };

    processedRoutes.push(processedRoute);
  }

  return processedRoutes;
}

function normalizePath(path: string) {
  if (path[0] === "/") {
    return path.slice(1);
  }
  return path;
}

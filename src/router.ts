import {
  Component,
  computed,
  reactive,
  ReactiveValue,
  TemplateResult,
  xml,
} from "destiny";
import type { Route, Routes } from "./types";

function getRoutePath(url: string) {
  return new URL(url).pathname;
}

const currentPath = reactive(getRoutePath(window.location.href));

window.addEventListener("popstate", () => {
  currentPath.value = window.location.href;
});

export class RouterComponent extends Component {
  #errorPage = new ReactiveValue(xml``);
  #routes = new ReactiveValue<Routes>([]);
  #component = computed(() => {
    let path = currentPath.value;

    let route: Route | null;

    for (let i = 0; i < 10; i++) {
      route = this.#matchRoute(path);

      if (!route) {
        return this.errorPage;
      } else if (route.redirectTo) {
        path = route.redirectTo;
      } else {
        return this.#getRouteComponent(route);
      }
    }

    throw new Error(`Too many redirects encountered for ${currentPath.value}.`);
  });

  set routes(routes: Routes) {
    this.#routes.value = normalizeRoutePaths(routes);
  }

  set errorPage(errorPage: TemplateResult) {
    this.#errorPage.value = errorPage;
  }

  #matchRoute(path: string, routes: Routes = this.routes): Route | null {
    path = normalizePath(path);
    for (const route of routes) {
      const routePath = route.path;
      if (path.startsWith(routePath)) {
        if (route.children?.length) {
          return this.#matchRoute(path.slice(route.path.length));
        } else {
          return route;
        }
      }
    }
    return null;
  }

  #getRouteComponent(route: Route) {
    if (route.component instanceof Component) {
      return route.component;
    } else if (route.component) {
      return route.component();
    } else {
      throw new Error(
        `The provided route ${route.path} does not have a registered component.`
      );
    }
  }

  template = xml`
    <${this.#component} prop:fallback=${this.#errorPage} />
  `;
}

function normalizeRoutePaths(routes: Routes): Routes {
  const processedRoutes = [];

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

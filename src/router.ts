// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

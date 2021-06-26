import type { TemplateResult } from "destiny";

// TODO: try and make this generic
export interface RouteParams {
  [key: string]: string;
}

export interface Route {
  path: string;
  children?: Routes;
  template?: (params: RouteParams) => TemplateResult;
  redirectTo?: string;
}

export type Routes = readonly Route[];

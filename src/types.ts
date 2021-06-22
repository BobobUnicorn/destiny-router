import type { Component } from "destiny";

export type ComponentResolver = () =>
  | Component
  | Promise<{ default: Component }>;

export interface Route {
  path: string;
  children?: Routes;
  component?: Component | ComponentResolver;
  redirectTo?: string;
}

export type Routes = Route[];

import assert from "node:assert/strict";
import test from "node:test";
import { contextContracts, type ContractRoute } from "../contracts/context-contracts";
import { createApiApp } from "./app";

type ExpressRouteLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
};

function registeredRoutes(app: unknown): Set<string> {
  const stack = (app as { _router?: { stack?: ExpressRouteLayer[] } })._router?.stack ?? [];
  const routes = new Set<string>();
  for (const layer of stack) {
    if (!layer.route) continue;
    for (const method of Object.keys(layer.route.methods)) routes.add(`${method.toUpperCase()} ${layer.route.path}`);
  }
  return routes;
}

test("pilot contract inventory matches registered Express routes", () => {
  const routes = registeredRoutes(createApiApp());
  const expected: ContractRoute[] = contextContracts.flatMap((contract) => [...contract.routes] as ContractRoute[]);
  const missing = expected
    .map((route) => `${route.method} ${route.path}`)
    .filter((route) => !routes.has(route));
  assert.deepEqual(missing, []);
});

// Typed route constants — every Link/redirect added under src/app/(app)
// should use these instead of raw path strings.

export const ROUTES = {
  home: "/",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
  },
  admin: "/admin",
  pos: {
    root: "/pos",
    hold: "/pos/hold",
    close: "/pos/close",
  },
  dashboard: "/dashboard",
  products: "/products",
  productsNew: "/products/new",
  inventory: {
    root: "/inventory",
    new: "/inventory/new",
    detail: (id: string) => `/inventory/${id}`,
  },
  sales: {
    root: "/sales",
    detail: (id: string) => `/sales/${id}`,
  },
  customers: {
    root: "/customers",
    detail: (id: string) => `/customers/${id}`,
  },
  suppliers: "/suppliers",
  reports: "/reports",
  discounts: "/discounts",
  settings: {
    root: "/settings",
    hardware: "/settings/hardware",
  },
} as const;

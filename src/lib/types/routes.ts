// Typed route constants — every Link/redirect added under src/app/(app)
// should use these instead of raw path strings.

export const ROUTES = {
  home: "/",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  admin: "/admin",
  profile: "/profile",
  pos: {
    root: "/pos",
    hold: "/pos/hold",
    close: "/pos/close",
  },
  dashboard: "/dashboard",
  products: "/products",
  productsNew: "/products/new",
  productDetail: (id: string) => `/products/${id}`,
  inventory: {
    root: "/inventory",
    new: "/inventory/new",
    detail: (id: string) => `/inventory/${id}`,
    alerts: "/inventory/alerts",
    movements: "/inventory/movements",
    transfers: "/inventory/transfers",
  },
  purchases: {
    root: "/purchases",
    new: "/purchases/new",
    detail: (id: string) => `/purchases/${id}`,
    returns: "/purchases/returns",
  },
  sales: {
    root: "/sales",
    detail: (id: string) => `/sales/${id}`,
  },
  suppliers: "/suppliers",
  reports: "/reports",
  discounts: "/discounts",
  users: "/users",
  settings: {
    root: "/settings",
    hardware: "/settings/hardware",
  },
} as const;

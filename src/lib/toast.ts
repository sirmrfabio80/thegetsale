// Toasts are disabled app-wide. This shim replaces `sonner`'s `toast` API
// with no-ops so existing call sites keep compiling without rendering popups.
type AnyArgs = unknown[];
const noop = (..._args: AnyArgs): string | number => "";

export const toast = Object.assign(noop, {
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
  message: noop,
  loading: noop,
  custom: noop,
  promise: (p: unknown) => p,
  dismiss: noop,
}) as unknown as {
  (message?: unknown, opts?: unknown): string | number;
  success: (...args: AnyArgs) => string | number;
  error: (...args: AnyArgs) => string | number;
  info: (...args: AnyArgs) => string | number;
  warning: (...args: AnyArgs) => string | number;
  message: (...args: AnyArgs) => string | number;
  loading: (...args: AnyArgs) => string | number;
  custom: (...args: AnyArgs) => string | number;
  promise: <T>(p: T) => T;
  dismiss: (...args: AnyArgs) => string | number;
};

/**
 * Shared inline-style type for the Next app and SPA.
 *
 * Importing React's `CSSProperties` from a component under `frontend/src`
 * resolves to the frontend's `csstype` copy when the SPA typechecks shared
 * components, which conflicts with the SPA's own `csstype`. This neutral type
 * keeps CSS custom properties (e.g. `--d`) working in both apps.
 */
export type InlineStyle = Record<string, string | number | undefined>;

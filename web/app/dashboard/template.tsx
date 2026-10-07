import { ViewTransition } from "react";

/**
 * Unlike a layout, a template remounts on every navigation, which is what lets
 * the old page fade out and the new one rise in. The sidebar lives in the
 * layout and stays put.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition default="none" enter="page-swap" exit="page-swap">
      {children}
    </ViewTransition>
  );
}

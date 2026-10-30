import { useEffect } from "react";

export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // A dnd-kit keyboard drag (e.g. reordering stages in Beállítások) uses
      // Escape to cancel the drag; that must not also close the modal. The
      // drag handle carries aria-pressed="true" while it is being dragged.
      if (
        e.target instanceof Element &&
        e.target.closest('[aria-pressed="true"][aria-roledescription]')
      ) {
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

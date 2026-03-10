"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function FullscreenToggleButton() {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => void toggleFullscreen()}>
      {active ? "Tam Ekrandan Çık" : "Tam Ekran Modu"}
    </Button>
  );
}

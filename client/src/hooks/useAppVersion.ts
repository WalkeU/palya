import { useEffect, useState } from "react";
import { api } from "../api/client";

export function useAppVersion(): string {
  const [version, setVersion] = useState("");
  useEffect(() => {
    api<{ version: string }>("/api/version")
      .then((d) => setVersion(d.version))
      .catch(() => {});
  }, []);
  return version;
}

"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deletePrint } from "../actions";

export function DeletePrintButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this print job and all associated alerts?")) {
      return;
    }
    setBusy(true);
    try {
      await deletePrint(id);
    } catch (err) {
      console.error("Failed to delete print job:", err);
      setBusy(false);
    }
  }

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleDelete}
      disabled={busy}
      iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    >
      Delete
    </Button>
  );
}

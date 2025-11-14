
import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QueryState } from "@/types";
import { Code } from "@/components/ui/code";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
}

export function DeleteAccountModal({ isOpen, onClose, currentUsername }: DeleteAccountModalProps) {
  const [confirmationUsername, setConfirmationUsername] = useState("");
  const [deleteState, setDeleteState] = useState<QueryState>("idle");
  const [error, setError] = useState<string | null>(null);

  const isUsernameMatch = confirmationUsername === currentUsername;
  const canDelete = isUsernameMatch && deleteState !== "loading";

  const handleDelete = async () => {
    if (!canDelete) return;

    setDeleteState("loading");
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: currentUsername }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error?.message || "Failed to delete account");
      }

      // Account deleted successfully
      // Show success toast
      toast.success("Account deleted successfully", {
        description: "Your account and all data have been permanently removed.",
      });

      // Redirect to signin page (this will clear the session since user is no longer authenticated)
      window.location.href = "/signin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleteState("error");
    }
  };

  const handleClose = () => {
    if (deleteState === "loading") return; // Prevent closing while deleting
    setConfirmationUsername("");
    setError(null);
    setDeleteState("idle");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </SheetTitle>
          <SheetDescription className="pt-3">
            This action cannot be undone. This will permanently delete your account, profile, and all portfolio data.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6 px-4">
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action is irreversible. All your data including:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Your user account</li>
                <li>Your profile information</li>
                <li>All portfolio sections and components</li>
                <li>Published portfolio data</li>
              </ul>
              will be permanently removed.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirmation-username">
              Type <Code>{currentUsername}</Code> to confirm
            </Label>
            <Input
              id="confirmation-username"
              value={confirmationUsername}
              onChange={(e) => setConfirmationUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={deleteState === "loading"}
            />
          </div>

          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={deleteState === "loading"}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete} className="gap-2">
            {deleteState === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Account
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsernameChangeForm } from "./username-change-form";
import { DeleteAccountModal } from "./delete-account-modal";
import type { User } from "@/types";

interface SettingsContentProps {
  user: User;
}

export function SettingsContent({ user }: SettingsContentProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Username Change Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Username</CardTitle>
            <CardDescription>
              Update your portfolio URL. It will be available at{" "}
              <code className="text-xs bg-neutral-300 px-1 py-0.5 ">https://{"{username}"}.hackerfolio.com</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsernameChangeForm currentUsername={user.username} />
          </CardContent>
        </Card>

        {/* Delete Account Section */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription className="text-destructive/90">
              Once you delete your account, there is no going back. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        currentUsername={user.username || ""}
      />
    </div>
  );
}

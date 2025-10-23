"use client";

import * as React from "react";
import { useState } from "react";
import { Save, Eye, EyeOff, Palette, User, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsContent() {
  const [profileSettings, setProfileSettings] = useState({
    username: "",
    displayName: "",
    email: "",
    bio: "",
    website: "",
    location: "",
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "system", // system, light, dark
    showProfilePicture: true,
    showEmail: true,
    showLocation: true,
    compactMode: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public", // public, private, unlisted
    showEmail: true,
    showLocation: true,
    allowMessages: true,
    showOnlineStatus: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfileSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field: string, value: boolean | string) => {
    setAppearanceSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: string, value: boolean | string) => {
    setPrivacySettings((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    // TODO: Implement API call to save profile settings
    console.log("Saving profile settings:", profileSettings);
  };

  const handleSaveAppearance = () => {
    // TODO: Implement API call to save appearance settings
    console.log("Saving appearance settings:", appearanceSettings);
  };

  const handleSavePrivacy = () => {
    // TODO: Implement API call to save privacy settings
    console.log("Saving privacy settings:", privacySettings);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match!");
      return;
    }
    // TODO: Implement API call to change password
    console.log("Changing password");
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your public profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileSettings.username}
                    onChange={(e) => handleProfileChange("username", e.target.value)}
                    placeholder="your-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileSettings.displayName}
                    onChange={(e) => handleProfileChange("displayName", e.target.value)}
                    placeholder="Your Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileSettings.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={profileSettings.website}
                  onChange={(e) => handleProfileChange("website", e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profileSettings.location}
                  onChange={(e) => handleProfileChange("location", e.target.value)}
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileSettings.bio}
                  onChange={(e) => handleProfileChange("bio", e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveProfile} className="gap-2">
                <Save className="h-4 w-4" />
                Save Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={handleChangePassword} className="gap-2">
                <Save className="h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Display</CardTitle>
              <CardDescription>Customize the appearance of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={appearanceSettings.theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAppearanceChange("theme", "light")}
                    >
                      Light
                    </Button>
                    <Button
                      variant={appearanceSettings.theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAppearanceChange("theme", "dark")}
                    >
                      Dark
                    </Button>
                    <Button
                      variant={appearanceSettings.theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAppearanceChange("theme", "system")}
                    >
                      System
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Profile Picture</Label>
                      <p className="text-sm text-muted-foreground">Display your profile picture in the sidebar</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.showProfilePicture}
                      onCheckedChange={(checked) => handleAppearanceChange("showProfilePicture", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Email</Label>
                      <p className="text-sm text-muted-foreground">Display your email address publicly</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.showEmail}
                      onCheckedChange={(checked) => handleAppearanceChange("showEmail", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Location</Label>
                      <p className="text-sm text-muted-foreground">Display your location publicly</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.showLocation}
                      onCheckedChange={(checked) => handleAppearanceChange("showLocation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Use a more compact layout</p>
                    </div>
                    <Switch
                      checked={appearanceSettings.compactMode}
                      onCheckedChange={(checked) => handleAppearanceChange("compactMode", checked)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAppearance} className="gap-2">
                <Save className="h-4 w-4" />
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>Control who can see your information and contact you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Visibility</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={privacySettings.profileVisibility === "public" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePrivacyChange("profileVisibility", "public")}
                    >
                      Public
                    </Button>
                    <Button
                      variant={privacySettings.profileVisibility === "private" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePrivacyChange("profileVisibility", "private")}
                    >
                      Private
                    </Button>
                    <Button
                      variant={privacySettings.profileVisibility === "unlisted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePrivacyChange("profileVisibility", "unlisted")}
                    >
                      Unlisted
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {privacySettings.profileVisibility === "public" && "Anyone can view your profile"}
                    {privacySettings.profileVisibility === "private" && "Only you can view your profile"}
                    {privacySettings.profileVisibility === "unlisted" &&
                      "Only people with the link can view your profile"}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Email Address</Label>
                      <p className="text-sm text-muted-foreground">Allow others to see your email address</p>
                    </div>
                    <Switch
                      checked={privacySettings.showEmail}
                      onCheckedChange={(checked) => handlePrivacyChange("showEmail", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Location</Label>
                      <p className="text-sm text-muted-foreground">Allow others to see your location</p>
                    </div>
                    <Switch
                      checked={privacySettings.showLocation}
                      onCheckedChange={(checked) => handlePrivacyChange("showLocation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Messages</Label>
                      <p className="text-sm text-muted-foreground">Let others send you messages</p>
                    </div>
                    <Switch
                      checked={privacySettings.allowMessages}
                      onCheckedChange={(checked) => handlePrivacyChange("allowMessages", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Online Status</Label>
                      <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                    </div>
                    <Switch
                      checked={privacySettings.showOnlineStatus}
                      onCheckedChange={(checked) => handlePrivacyChange("showOnlineStatus", checked)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePrivacy} className="gap-2">
                <Save className="h-4 w-4" />
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Loader2, Camera, Save } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { userAPI } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";

/**
 * Modal dialog for viewing and editing user profile
 */
export default function ProfileModal({ open, onOpenChange }) {
  const { user, updateProfile } = useApp();
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    avatar: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync form data when user data changes or modal opens
  useEffect(() => {
    if (open && user) {
      setFormData({
        displayName: user.displayName || "",
        bio: user.bio || "",
        avatar: user.avatar || "",
      });
      setError(null);
    }
  }, [open, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await userAPI.updateProfile(formData);
      updateProfile(response.user);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Profile Settings</DialogTitle>
          <DialogDescription className="text-center">
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        {/* Profile Preview */}
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <UserAvatar user={{ ...user, ...formData }} size="xl" />
            <button className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground ring-2 ring-background hover:bg-primary/90 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-3 text-lg font-semibold">
            {formData.displayName || user.username}
          </p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <Badge
            variant={user.status === "online" ? "success" : "secondary"}
            className="mt-2"
          >
            {user.status === "online" ? "Online" : "Offline"}
          </Badge>
        </div>

        <Separator />

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-displayName">Display Name</Label>
            <Input
              id="profile-displayName"
              name="displayName"
              type="text"
              placeholder="Your display name"
              value={formData.displayName}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              name="bio"
              placeholder="Tell others about yourself..."
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/200
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-avatar">Avatar URL (optional)</Label>
            <Input
              id="profile-avatar"
              name="avatar"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={formData.avatar}
              onChange={handleChange}
            />
          </div>

          {/* Account Info */}
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">
                {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
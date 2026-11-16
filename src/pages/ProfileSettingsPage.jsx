import { useEffect, useState } from "react";
import { Loader2, Moon, Save, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function ProfileSettingsPage() {
  const { user, setUser, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.getProfile();
        setName(res.user.name);
        setProfileImage(res.user.profileImage || "");
        setActivity(res.activityHistory);
      } catch {
        // Handled silently
      }
    }
    void loadProfile();
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        name,
        profileImage,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      setUser(res.user);
      setCurrentPassword("");
      setNewPassword("");
      showToast("Profile and account settings updated.", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update profile.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Account &amp; Profile Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your researcher profile, password, and appearance preferences.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-3 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Profile Picture URL (optional)
            </label>
            <input
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://..."
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Change Password (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Theme:
              </span>
              <button
                type="button"
                onClick={() => void toggleTheme()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <>
                    <Moon className="h-3.5 w-3.5 text-purple-400" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
          Research Activity History
        </h2>
        <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No activity recorded yet.
            </p>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {item.action}
                  </p>
                  <p className="truncate text-slate-500 dark:text-slate-400">
                    {item.targetTitle}
                  </p>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-400 shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

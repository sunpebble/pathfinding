'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
  });

  useEffect(() => {
    if (authLoading)
      return;

    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    fetch(`/api/users/${user.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then((data) => {
        setProfile(data.data);
        setFormData({
          displayName: data.data?.display_name ?? '',
          bio: data.data?.bio ?? '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, user, token]);

  const handleSave = async () => {
    if (!user || !token)
      return;

    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      setEditing(false);
      // Refresh profile
      const res = await fetch(`/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data.data);
    }
    catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        {/* Avatar and name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {profile.display_name?.[0] ?? profile.name?.[0] ?? '?'}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile.display_name ?? profile.name}</h2>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 py-4 border-y">
          <div className="text-center">
            <p className="text-lg font-semibold">{profile.followers_count}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{profile.following_count}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
        </div>

        {/* Bio */}
        {editing
          ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          : (
              <div>
                <p className="text-gray-700">{profile.bio ?? 'No bio yet.'}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Edit Profile
                </button>
              </div>
            )}

        {/* Joined date */}
        <p className="text-sm text-gray-400">
          Joined
          {' '}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

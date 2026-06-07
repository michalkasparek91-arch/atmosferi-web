import { useEffect, useState } from "react";
import ContentLoader from "@/components/ContentLoader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Pencil, X } from "lucide-react";
import CityAutocomplete from "./CityAutocomplete";
import { compressProfilePhoto } from "@/lib/image-compression";

export const CustomerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    region: "",
    country: "",
    avatar_url: "",
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setProfile({
        full_name: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        city: profileData.city || "",
        region: profileData.region || "",
        country: profileData.country || "Česká republika",
        avatar_url: profileData.avatar_url || "",
      });
    }

    setLoading(false);
  };

  const handleSave = async (field?: string) => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const updateData = {
      full_name: profile.full_name,
      phone: profile.phone,
      city: profile.city,
      region: profile.region,
      country: profile.country,
      avatar_url: profile.avatar_url,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id);

    if (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit profil",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Úspěch",
        description: "Profil byl úspěšně uložen",
      });
      if (field) {
        setEditingField(null);
      }
    }
    
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const compressedFile = await compressProfilePhoto(file);
    const fileExt = 'jpg';
    const fileName = `${session.user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, compressedFile);

    if (uploadError) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se nahrát fotografii",
        variant: "destructive",
      });
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    setProfile({ ...profile, avatar_url: publicUrl });
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', session.user.id);

    if (updateError) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit fotografii",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Úspěch",
        description: "Profilová fotografie byla nahrána",
      });
    }

    setUploadingAvatar(false);
  };

  const handleCityChange = (city: string) => {
    setProfile({ 
      ...profile, 
      city,
      region: "", // Will be auto-populated from city data
      country: "Česká republika"
    });
  };

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="bg-background rounded-3xl border-0">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.charAt(0) || "Z"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {/* Name */}
            <div className="text-center w-full max-w-md">
              {editingField === 'full_name' ? (
                <div className="space-y-2">
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="text-center text-2xl font-semibold"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => handleSave('full_name')} disabled={saving}>
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingField(null)}>
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-semibold">{profile.full_name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingField('full_name')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* City */}
            <div className="text-center w-full max-w-md">
              {editingField === 'city' ? (
                <div className="space-y-2">
                  <CityAutocomplete
                    value={profile.city}
                    onChange={handleCityChange}
                    label=""
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => handleSave('city')} disabled={saving}>
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingField(null)}>
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <p className="text-muted-foreground">{profile.city || "Vyberte město"}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingField('city')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card className="bg-background rounded-3xl border-0">
        <CardHeader>
          <CardTitle>Kontaktní informace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={profile.email}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Telefon</Label>
            {editingField === 'phone' ? (
              <div className="space-y-2">
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+420 XXX XXX XXX"
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleSave('phone')} disabled={saving}>
                    Uložit
                  </Button>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Zrušit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={profile.phone || "Není uvedeno"}
                  disabled
                  className="bg-muted"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingField('phone')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

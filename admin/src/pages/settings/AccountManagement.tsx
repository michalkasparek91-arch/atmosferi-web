import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const AccountManagement = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [editingAuthEmail, setEditingAuthEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [tempAuthEmail, setTempAuthEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerifyPhoneDialog, setShowVerifyPhoneDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAuthUser();
  }, []);

  const loadAuthUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAuthUser(user);
      setTempAuthEmail(user.email || '');
      setTempPhone(user.phone || '');
    }
  };

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setTempPhone(profileData.phone || '');
    }
  };

  const handleUpdateAuthEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email: tempAuthEmail });
    
    if (error) {
      console.error('Error updating email:', error);
      alert('Chyba při aktualizaci emailu');
    } else {
      await loadAuthUser();
      setEditingAuthEmail(false);
      alert('Email byl úspěšně aktualizován');
    }
  };

  const handleUpdatePhone = async () => {
    const { error } = await supabase.auth.updateUser({ phone: tempPhone });
    
    if (error) {
      console.error('Error updating phone:', error);
      alert('Chyba při aktualizaci telefonu');
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({ phone: tempPhone, phone_verified: false })
          .eq('id', session.user.id);
      }
      await loadAuthUser();
      await loadProfile();
      setEditingPhone(false);
      alert('Telefon byl úspěšně aktualizován');
    }
  };

  const handleSendVerification = async () => {
    if (!profile?.phone) {
      alert('Nejprve zadejte telefonní číslo');
      return;
    }

    setSendingVerification(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/send-phone-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ phone: profile.phone }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setShowVerifyPhoneDialog(true);
      alert('Ověřovací kód byl odeslán na vaše telefonní číslo');
    } catch (error) {
      console.error('Error sending verification:', error);
      alert('Chyba při odesílání ověřovacího kódu');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Zadejte platný 6-místný kód');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/verify-phone-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ code: verificationCode }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify code');
      }

      setShowVerifyPhoneDialog(false);
      setVerificationCode('');
      await loadProfile();
      alert('Telefonní číslo bylo úspěšně ověřeno!');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      alert(error.message || 'Neplatný ověřovací kód');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      alert('Zadejte prosím aktuální heslo');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Nová hesla se neshodují');
      return;
    }

    if (newPassword.length < 6) {
      alert('Nové heslo musí mít alespoň 6 znaků');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser?.email || '',
      password: currentPassword,
    });

    if (signInError) {
      alert('Aktuální heslo je nesprávné');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      console.error('Error updating password:', error);
      alert('Chyba při změně hesla');
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEditingPassword(false);
      alert('Heslo bylo úspěšně změněno');
    }
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-4 md:pt-8 pb-6">
      <div className="w-full space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/remeslnik/nastaveni')}
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět do nastavení
        </Button>

        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Email */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Přihlašovací email</label>
              {editingAuthEmail ? (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={tempAuthEmail}
                    onChange={(e) => setTempAuthEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateAuthEmail}>
                      <Check className="h-4 w-4 mr-1" />
                      Uložit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingAuthEmail(false);
                        setTempAuthEmail(authUser?.email || '');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{authUser?.email}</span>
                  {authUser?.email_confirmed_at && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingAuthEmail(true)}
                  >
                    Upravit
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="border-t pt-6">
              <label className="text-sm font-semibold mb-2 block">Telefonní číslo</label>
              {editingPhone ? (
                <div className="space-y-2">
                  <Input
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="+420 XXX XXX XXX"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdatePhone}>
                      <Check className="h-4 w-4 mr-1" />
                      Uložit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingPhone(false);
                        setTempPhone(profile?.phone || '');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{profile?.phone || 'Telefon nenastaven'}</span>
                    {profile?.phone_verified ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : profile?.phone ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : null}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingPhone(true)}
                    >
                      Upravit
                    </Button>
                  </div>
                  {profile?.phone && !profile?.phone_verified && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleSendVerification}
                      disabled={sendingVerification}
                    >
                      {sendingVerification ? 'Odesílání...' : 'Odeslat ověřovací SMS'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="border-t pt-6">
              <label className="text-sm font-semibold mb-2 block">Změnit přihlašovací heslo</label>
              {editingPassword ? (
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Aktuální heslo"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Nové heslo"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Potvrďte nové heslo"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleChangePassword}>
                      <Check className="h-4 w-4 mr-1" />
                      Změnit heslo
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingPassword(true)}
                >
                  Změnit heslo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone Verification Dialog */}
      <Dialog open={showVerifyPhoneDialog} onOpenChange={setShowVerifyPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ověření telefonního čísla</DialogTitle>
            <DialogDescription>
              Zadejte 6-místný kód, který jsme odeslali na vaše telefonní číslo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
            <Button onClick={handleVerifyCode} className="w-full">
              Ověřit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountManagement;

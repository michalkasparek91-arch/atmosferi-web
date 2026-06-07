import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeGoBack } from "@/utils/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Building2, 
  User, 
  FileCheck, 
  Upload, 
  ArrowLeft, 
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X
} from "lucide-react";
import { compressImage } from "@/lib/image-compression";

type Step = 1 | 2 | 3;
type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface VerificationData {
  id?: string;
  status: VerificationStatus;
  ico: string;
  company_name: string;
  company_address: string;
  ico_declaration_accepted: boolean;
  id_card_path: string | null;
  trade_license_path: string | null;
  rejection_reason: string | null;
}

export default function WorkerVerification() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingAres, setFetchingAres] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<VerificationData>({
    status: 'unverified',
    ico: '',
    company_name: '',
    company_address: '',
    ico_declaration_accepted: false,
    id_card_path: null,
    trade_license_path: null,
    rejection_reason: null,
  });

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [tradeLicensePreview, setTradeLicensePreview] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/prihlaseni');
        return;
      }
      setUserId(user.id);

      // Load existing verification data
      const { data: verification } = await supabase
        .from('worker_verifications')
        .select('*')
        .eq('worker_id', user.id)
        .single();

      if (verification) {
        setFormData({
          id: verification.id,
          status: verification.status as VerificationStatus,
          ico: verification.ico || '',
          company_name: verification.company_name || '',
          company_address: verification.company_address || '',
          ico_declaration_accepted: verification.ico_declaration_accepted || false,
          id_card_path: verification.id_card_path,
          trade_license_path: verification.trade_license_path,
          rejection_reason: verification.rejection_reason,
        });

        // If already verified or pending, show status
        if (verification.status === 'verified' || verification.status === 'pending') {
          navigate('/remeslnik/profil');
          return;
        }
      }
    } catch (error) {
      console.error('Error loading verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAresData = async () => {
    if (!formData.ico || formData.ico.length !== 8) {
      toast.error('Zadejte platné 8-místné IČO');
      return;
    }

    setFetchingAres(true);
    try {
      // ARES API call simulation - in production, use a backend proxy
      const response = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${formData.ico}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          company_name: data.obchodniJmeno || '',
          company_address: data.sidlo?.textovaAdresa || '',
        }));
        toast.success('Údaje byly načteny z ARES');
      } else {
        toast.error('IČO nebylo nalezeno v registru ARES');
      }
    } catch (error) {
      // Fallback - manual entry required
      toast.info('Nepodařilo se načíst data z ARES. Vyplňte údaje ručně.');
    } finally {
      setFetchingAres(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'id_card' | 'trade_license'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Povolené formáty: JPG, PNG, WEBP, PDF');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Maximální velikost souboru je 10 MB');
      return;
    }

    // Compress if image
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, 1920, 0.85);
      } catch (error) {
        console.error('Compression error:', error);
      }
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'id_card') {
          setIdCardPreview(reader.result as string);
        } else {
          setTradeLicensePreview(reader.result as string);
        }
      };
      reader.readAsDataURL(processedFile);
    }

    if (type === 'id_card') {
      setIdCardFile(processedFile);
    } else {
      setTradeLicenseFile(processedFile);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage
      .from('verification-documents')
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!userId) return;

    // Validation
    if (!formData.ico || !formData.ico_declaration_accepted) {
      toast.error('Vyplňte IČO a potvrďte prohlášení');
      setCurrentStep(1);
      return;
    }

    if (!idCardFile && !formData.id_card_path) {
      toast.error('Nahrajte fotografii občanského průkazu');
      setCurrentStep(2);
      return;
    }

    setSaving(true);
    try {
      let idCardPath = formData.id_card_path;
      let tradeLicensePath = formData.trade_license_path;

      // Upload ID card if new file
      if (idCardFile) {
        const ext = idCardFile.name.split('.').pop();
        idCardPath = await uploadFile(
          idCardFile, 
          `${userId}/id-card-${Date.now()}.${ext}`
        );
      }

      // Upload trade license if new file
      if (tradeLicenseFile) {
        const ext = tradeLicenseFile.name.split('.').pop();
        tradeLicensePath = await uploadFile(
          tradeLicenseFile,
          `${userId}/trade-license-${Date.now()}.${ext}`
        );
      }

      // Upsert verification record
      const verificationData = {
        worker_id: userId,
        status: 'pending' as const,
        ico: formData.ico,
        company_name: formData.company_name,
        company_address: formData.company_address,
        ico_declaration_accepted: formData.ico_declaration_accepted,
        id_card_path: idCardPath,
        trade_license_path: tradeLicensePath,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      };

      if (formData.id) {
        await supabase
          .from('worker_verifications')
          .update(verificationData)
          .eq('id', formData.id);
      } else {
        await supabase
          .from('worker_verifications')
          .insert(verificationData);
      }

      toast.success('Žádost o ověření byla odeslána!');
      navigate('/remeslnik/profil');
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Nepodařilo se odeslat žádost');
    } finally {
      setSaving(false);
    }
  };

  const canProceedToStep2 = formData.ico.length === 8 && formData.ico_declaration_accepted;
  const canProceedToStep3 = idCardFile || formData.id_card_path;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => safeGoBack(navigate, '/remeslnik/nastaveni')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ověření profilu</h1>
            <p className="text-muted-foreground">
              Získejte odznak důvěryhodného dodavatele
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[
            { step: 1, icon: Building2, label: 'Firemní údaje' },
            { step: 2, icon: User, label: 'Totožnost' },
            { step: 3, icon: FileCheck, label: 'Odbornost' },
          ].map(({ step, icon: Icon, label }, index) => (
            <div key={step} className="flex items-center">
              <div 
                className={`flex items-center gap-2 cursor-pointer ${
                  currentStep >= step ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => step < currentStep && setCurrentStep(step as Step)}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${currentStep > step ? 'bg-primary text-primary-foreground' : ''}
                  ${currentStep === step ? 'bg-primary/10 border-2 border-primary' : ''}
                  ${currentStep < step ? 'bg-muted' : ''}
                `}>
                  {currentStep > step ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{label}</span>
              </div>
              {index < 2 && (
                <div className={`w-12 sm:w-24 h-0.5 mx-2 ${
                  currentStep > step ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Rejection Alert */}
        {formData.status === 'rejected' && formData.rejection_reason && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">
              <strong>Předchozí žádost byla zamítnuta:</strong> {formData.rejection_reason}
            </p>
          </div>
        )}

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firemní údaje
              </CardTitle>
              <CardDescription>
                Zadejte své IČO pro ověření podnikatelského oprávnění
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ico">IČO (8 číslic)</Label>
                <div className="flex gap-2">
                  <Input
                    id="ico"
                    placeholder="12345678"
                    value={formData.ico}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      ico: e.target.value.replace(/\D/g, '').slice(0, 8) 
                    }))}
                    maxLength={8}
                  />
                  <Button 
                    variant="outline" 
                    onClick={fetchAresData}
                    disabled={formData.ico.length !== 8 || fetchingAres}
                  >
                    {fetchingAres ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Načíst z ARES'
                    )}
                  </Button>
                </div>
              </div>

              {formData.company_name && (
                <>
                  <div className="space-y-2">
                    <Label>Název společnosti</Label>
                    <Input value={formData.company_name} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sídlo</Label>
                    <Input value={formData.company_address} readOnly className="bg-muted" />
                  </div>
                </>
              )}

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Checkbox
                  id="declaration"
                  checked={formData.ico_declaration_accepted}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    ico_declaration_accepted: checked === true
                  }))}
                />
                <Label htmlFor="declaration" className="text-sm leading-relaxed cursor-pointer">
                  Prohlašuji, že jsem oprávněn podnikat pod tímto IČO a všechny uvedené údaje jsou pravdivé.
                </Label>
              </div>

              <Button 
                className="w-full" 
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
              >
                Pokračovat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Identity */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ověření totožnosti
              </CardTitle>
              <CardDescription>
                Nahrajte fotografii občanského průkazu (přední strana)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Tento dokument slouží <strong>pouze pro jednorázovou kontrolu správcem</strong>. 
                  Po schválení bude automaticky smazán. Nikdy nebude zveřejněn.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Občanský průkaz (přední strana) *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {idCardPreview || formData.id_card_path ? (
                    <div className="relative">
                      {idCardPreview ? (
                        <img 
                          src={idCardPreview} 
                          alt="ID Card preview" 
                          className="max-h-48 mx-auto rounded-lg"
                        />
                      ) : (
                        <div className="py-8 text-muted-foreground">
                          <FileCheck className="h-12 w-12 mx-auto mb-2" />
                          <p>Dokument již nahrán</p>
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setIdCardFile(null);
                          setIdCardPreview(null);
                          setFormData(prev => ({ ...prev, id_card_path: null }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Klikněte pro nahrání nebo přetáhněte soubor
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP nebo PDF (max 10 MB)
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange(e, 'id_card')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="rounded-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                >
                  Pokračovat
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Qualifications */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Odbornost (volitelné)
              </CardTitle>
              <CardDescription>
                Nahrajte živnostenský list nebo výpis z rejstříku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Živnostenský list / Výpis z rejstříku</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {tradeLicensePreview || formData.trade_license_path ? (
                    <div className="relative">
                      {tradeLicensePreview ? (
                        <img 
                          src={tradeLicensePreview} 
                          alt="Trade license preview" 
                          className="max-h-48 mx-auto rounded-lg"
                        />
                      ) : (
                        <div className="py-8 text-muted-foreground">
                          <FileCheck className="h-12 w-12 mx-auto mb-2" />
                          <p>Dokument již nahrán</p>
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setTradeLicenseFile(null);
                          setTradeLicensePreview(null);
                          setFormData(prev => ({ ...prev, trade_license_path: null }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Klikněte pro nahrání (volitelné)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP nebo PDF (max 10 MB)
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange(e, 'trade_license')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Souhrn žádosti</h4>
                <div className="text-sm space-y-1">
                  <p><strong>IČO:</strong> {formData.ico}</p>
                  {formData.company_name && (
                    <p><strong>Společnost:</strong> {formData.company_name}</p>
                  )}
                  <p><strong>Občanský průkaz:</strong> ✅ Nahrán</p>
                  <p><strong>Živnostenský list:</strong> {
                    tradeLicenseFile || formData.trade_license_path ? '✅ Nahrán' : '⏭️ Přeskočeno'
                  }</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="rounded-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Odesílám...
                    </>
                  ) : (
                    <>
                      Odeslat žádost
                      <ShieldCheck className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}

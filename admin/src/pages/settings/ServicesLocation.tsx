import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, AlertTriangle, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { WorkerLocationMap } from "@/components/WorkerLocationMap";
import * as Icons from "lucide-react";
import { geocodeAddress } from "@/lib/geocode-address";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { AddressAutocompleteInput, AddressSelectResult } from "@/components/AddressAutocompleteInput";

const ServicesLocation = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [editingLocation, setEditingLocation] = useState(false);
  
  
  // Individual address fields
  const [streetName, setStreetName] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');

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
      setProfile(profileData);
    }

    const { data: servicesData } = await supabase
      .from('worker_services')
      .select('*, service_subcategories(*, service_categories(*))')
      .eq('worker_id', session.user.id);
    
    if (servicesData && servicesData.length > 0) {
      setWorkerServices(servicesData);
    }
  };

  const handleSaveLocation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile) return;

    if (!streetNumber.trim()) {
      toast.error("Číslo popisné je povinné");
      return;
    }

    // Geocode from manual fields
    const coords = await geocodeAddress(streetName, streetNumber, city, postalCode);

    const fullAddr = streetName && streetNumber && city
      ? `${streetName} ${streetNumber}, ${postalCode} ${city}`.trim()
      : profile.full_address;

    const { error } = await supabase
      .from('profiles')
      .update({
        city: city || profile.city,
        full_address: fullAddr,
        latitude: coords?.lat ?? profile.latitude,
        longitude: coords?.lng ?? profile.longitude,
        street_name: streetName || null,
        street_number: streetNumber || null,
        postal_code: postalCode || null,
      })
      .eq('id', session.user.id);

    if (!error) {
      setEditingLocation(false);
      toast.success("Lokace byla uložena");
      loadProfile();
    } else {
      toast.error("Nepodařilo se uložit lokaci");
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon || Icons.Wrench;
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
          <CardContent className="p-6 space-y-8">
            {/* Services Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vaše služby</h3>
                <Button 
                  onClick={() => navigate('/remeslnik/upravit-sluzby')}
                  variant="outline"
                  size="sm"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Upravit služby
                </Button>
              </div>
              
              {workerServices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(workerServices.map((s: any) => s.service_subcategories?.service_categories?.id)))
                    .filter(Boolean)
                    .map((categoryId) => {
                      const firstService = workerServices.find((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                      const category = firstService?.service_subcategories?.service_categories;
                      const subcategories = workerServices.filter((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                      
                      if (!category) return null;
                      
                      const Icon = getIcon(category.icon);
                      
                      return (
                        <Popover key={categoryId as string}>
                          <PopoverTrigger asChild>
                            <button
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                            >
                              <Icon className="h-4 w-4 text-foreground" />
                              <span className="text-sm font-medium">{category.name}</span>
                              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                                {subcategories.length}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-0.5">
                              {subcategories.map((service: any) => (
                                <div key={service.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-foreground">
                                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  {service.service_subcategories?.name}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Žádné služby nevybrány</p>
              )}
            </div>

            {/* Location Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pracovní lokalita</h3>
                {!editingLocation && (
                  <Button 
                    onClick={() => {
                      setStreetName(profile?.street_name || '');
                      setStreetNumber(profile?.street_number || '');
                      setPostalCode(profile?.postal_code || '');
                      setCity(profile?.city || '');
                      setEditingLocation(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Změnit lokalitu
                  </Button>
                )}
              </div>

            {editingLocation ? (
                <div className="space-y-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Začněte psát adresu pro rychlé vyhledání, nebo vyplňte pole ručně. Tato adresa určuje, které zakázky ve vaší oblasti vám budeme nabízet.
                  </p>
                  
                  <AddressAutocompleteInput
                    onSelect={(result: AddressSelectResult) => {
                      setStreetName(result.streetName);
                      setStreetNumber(result.streetNumber);
                      setCity(result.city);
                      setPostalCode(result.postalCode);
                    }}
                    defaultValue={profile?.full_address || ''}
                    placeholder="Začněte psát adresu..."
                  />

                  {/* Individual address fields for review/correction */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium mb-1 block">Ulice</label>
                      <Input
                        value={streetName}
                        onChange={(e) => setStreetName(e.target.value)}
                        placeholder="Ulice"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium mb-1 block">Číslo popisné</label>
                      <Input
                        value={streetNumber}
                        onChange={(e) => setStreetNumber(e.target.value)}
                        placeholder="Číslo"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium mb-1 block">Město</label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Město"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium mb-1 block">PSČ</label>
                      <Input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="PSČ"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveLocation}>
                      Uložit lokaci
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingLocation(false);
                        setStreetName('');
                        setStreetNumber('');
                        setCity('');
                        setPostalCode('');
                        loadProfile();
                      }}
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 text-sm space-y-2">
                  {!profile?.latitude && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-3">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>Nemáte nastavenou přesnou lokaci. Nebudete dostávat upozornění na nové zakázky ve vaší oblasti.</span>
                    </div>
                  )}
                  <p><span className="font-semibold">Ulice:</span> {profile?.street_name ? `${profile.street_name}${profile.street_number ? ` ${profile.street_number}` : ''}` : 'Není nastavena'}</p>
                  <p><span className="font-semibold">Město:</span> {profile?.city || 'Není nastaveno'}</p>
                  <p><span className="font-semibold">PSČ:</span> {profile?.postal_code || 'Není nastaveno'}</p>
                  {profile?.latitude && (
                    <p className="text-xs text-muted-foreground">
                      Souřadnice: {profile.latitude.toFixed(4)}, {profile.longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              {profile?.city && (
                <div className="h-[400px] rounded-lg overflow-hidden">
                  <WorkerLocationMap city={profile.city} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServicesLocation;

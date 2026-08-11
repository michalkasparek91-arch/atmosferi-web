import React, { useState } from "react";
import { useInvoicing } from "@/lib/invoicingStore";
import { Contact } from "@/types/invoicing";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Search, Sparkles, Loader2, Building2, Mail, Globe, MapPin, Edit, Trash2, FileText } from "lucide-react";
import { fetchCompanyByIco } from "@/lib/ares";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminContacts() {
  const { contacts, upsertContact, deleteContact } = useInvoicing();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [aresLoading, setAresLoading] = useState(false);

  const filteredContacts = contacts.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.registrationNo && c.registrationNo.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      id: "c_" + Date.now(),
      name: "",
      street: "",
      city: "",
      zip: "",
      country: "CZ",
      registrationNo: "",
      vatNo: ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact);
    setModalOpen(true);
  };

  const handleAresLookup = async () => {
    const ico = formData.registrationNo;
    if (!ico) {
      toast.error("Zadejte IČO pro vyhledání v ARES");
      return;
    }
    setAresLoading(true);
    try {
      const res = await fetchCompanyByIco(ico);
      if (res) {
        setFormData(prev => ({
          ...prev,
          name: res.name,
          street: res.street,
          city: res.city,
          zip: res.zip,
          country: res.country,
          registrationNo: res.registrationNo,
          vatNo: res.vatNo
        }));
        toast.success(`Firma ${res.name} načtena z ARES`);
      }
    } catch (err: any) {
      toast.error(err.message || "Chyba při vyhledávání v ARES");
    } finally {
      setAresLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Zadejte název kontaktu / firmy");
      return;
    }
    upsertContact(formData as Contact);
    setModalOpen(false);
    toast.success("Kontakt byl úspěšně uložen");
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Opravdu chcete smazat kontakt ${name}?`)) {
      deleteContact(id);
      toast.success("Kontakt smazán");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        title={`Adresář Kontaktů (${contacts.length})`}
        subtitle="Správa vašich klientů a firem z Fakturoidu"
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Nový Kontakt
          </Button>
        }
      />

      {/* Search Bar */}
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat kontakt podle názvu, IČO, města nebo e-mailu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 text-sm"
          />
        </CardContent>
      </Card>

      {/* Grid of Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(contact => (
          <Card key={contact.id} className="rounded-xl border border-border hover:shadow-md transition-all group">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {contact.name}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEdit(contact)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(contact.id, contact.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3 text-xs text-muted-foreground">
                  {(contact.street || contact.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{contact.street}, {contact.zip} {contact.city} ({contact.country})</span>
                    </div>
                  )}

                  {contact.registrationNo && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-mono font-medium text-foreground">IČO: {contact.registrationNo}</span>
                      {contact.vatNo && <span className="font-mono text-muted-foreground">| DIČ: {contact.vatNo}</span>}
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      <a href={`mailto:${contact.email}`} className="hover:underline text-primary">{contact.email}</a>
                    </div>
                  )}

                  {contact.web && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-zinc-400" />
                      <a href={contact.web} target="_blank" rel="noreferrer" className="hover:underline text-primary truncate max-w-[200px]">{contact.web}</a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs gap-1.5"
                  onClick={() => navigate(`/faktury?newFor=${encodeURIComponent(contact.id)}`)}
                >
                  <FileText className="h-3.5 w-3.5" /> Vytvořit Fakturu
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Contact Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Úprava Kontaktů" : "Nový Kontakt / Firma"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>IČO (české registrování)</Label>
                <Input
                  className="mt-1 font-mono"
                  placeholder="Zadejte IČO pro ARES..."
                  value={formData.registrationNo || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, registrationNo: e.target.value }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAresLookup}
                disabled={aresLoading}
                className="mt-5 gap-1.5"
              >
                {aresLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                Načíst z ARES
              </Button>
            </div>

            <div>
              <Label>Název firmy / Jméno a Příjmení</Label>
              <Input
                className="mt-1 font-bold"
                value={formData.name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ulice a ČP</Label>
                <Input
                  className="mt-1"
                  value={formData.street || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                />
              </div>
              <div>
                <Label>Město</Label>
                <Input
                  className="mt-1"
                  value={formData.city || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>PSČ</Label>
                <Input
                  className="mt-1"
                  value={formData.zip || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                />
              </div>
              <div>
                <Label>Země (kód CZ, DE, SK...)</Label>
                <Input
                  className="mt-1"
                  value={formData.country || "CZ"}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div>
                <Label>DIČ</Label>
                <Input
                  className="mt-1 font-mono"
                  value={formData.vatNo || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, vatNo: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Web / URL</Label>
                <Input
                  className="mt-1"
                  value={formData.web || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, web: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Zrušit</Button>
            <Button onClick={handleSubmit}>Uložit Kontakt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

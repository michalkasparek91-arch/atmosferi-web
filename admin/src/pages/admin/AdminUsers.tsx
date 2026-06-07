import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, MoreHorizontal, User, Ban, CheckCircle, XCircle, Clock, LogIn, Shield, Trash2,
  Crown, Gift, CreditCard, Users, Briefcase, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { ProBadge } from "@/components/worker-badges/ProBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface UserWithAuth {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: 'customer' | 'worker' | 'both';
  created_at: string;
  is_admin: boolean | null;
  is_pro: boolean;
  pro_since: string | null;
  pro_expires_at: string | null;
  points: number;
  wallet_points: number;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string;
  banned: boolean;
  banned_until: string | null;
}

type FilterTab = 'all' | 'workers' | 'customers' | 'pro';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proDialogOpen, setProDialogOpen] = useState(false);
  const [proDuration, setProDuration] = useState("30");
  const [proAction, setProAction] = useState<'grant' | 'revoke'>('grant');
  const [selectedUser, setSelectedUser] = useState<UserWithAuth | null>(null);
  const [detailUser, setDetailUser] = useState<UserWithAuth | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingPro, setTogglingPro] = useState(false);
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState("");
  const [gifting, setGifting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Nepodařilo se načíst uživatele');
    } finally {
      setLoading(false);
    }
  };

  async function handleBanUser() {
    if (!selectedUser) return;
    toast.success(`Uživatel ${selectedUser.full_name} byl zablokován`);
    setBanDialogOpen(false);
    setSelectedUser(null);
  };

  async function handleDeleteUser() {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: selectedUser.id }
      });
      if (error) throw error;
      toast.success(`Uživatel ${selectedUser.full_name} byl smazán`);
      setUsers(users.filter(u => u.id !== selectedUser.id));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Nepodařilo se smazat uživatele');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  async function handleTogglePro() {
    // ... existing handleTogglePro code ...
    if (!selectedUser) return;
    setTogglingPro(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-toggle-pro', {
        body: {
          user_id: selectedUser.id,
          action: proAction,
          duration_days: parseInt(proDuration),
        }
      });
      if (error) throw error;
      toast.success(data?.message || (proAction === 'grant' ? 'PRO uděleno' : 'PRO odebráno'));
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling PRO:', error);
      toast.error('Chyba při změně PRO statusu');
    } finally {
      setTogglingPro(false);
      setProDialogOpen(false);
      setSelectedUser(null);
    }
  };

  async function handleGiftCredits() {
    if (!selectedUser || !giftAmount.trim()) {
      toast.error("Vyplňte částku");
      return;
    }

    const pointsAmount = parseInt(giftAmount);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      toast.error("Částka musí být kladné číslo");
      return;
    }

    setGifting(true);
    try {
      const { error } = await supabase.rpc('add_user_points', {
        target_user_id: selectedUser.id,
        points_to_add: pointsAmount
      });

      if (error) throw error;

      toast.success(`Úspěšně přidáno ${pointsAmount} kreditů uživateli ${selectedUser.full_name}`);
      setGiftAmount("");
      setGiftDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      console.error('Error gifting credits:', error);
      toast.error("Chyba při přidávání kreditů");
    } finally {
      setGifting(false);
    }
  };

  function openProDialog(user: UserWithAuth, action: 'grant' | 'revoke') {
    setSelectedUser(user);
    setProAction(action);
    setProDuration("30");
    setProDialogOpen(true);
  };

  function isProActive(user: UserWithAuth) {
    return user.is_pro && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (filterTab) {
      case 'workers': return user.user_type === 'worker' || user.user_type === 'both';
      case 'customers': return user.user_type === 'customer';
      case 'pro': return isProActive(user);
      default: return true;
    }
  });

  const stats = {
    total: users.length,
    workers: users.filter(u => u.user_type === 'worker' || u.user_type === 'both').length,
    customers: users.filter(u => u.user_type === 'customer').length,
    pro: users.filter(u => isProActive(u)).length,
  };

  function getUserTypeLabel(type: string) {
    switch (type) {
      case 'worker': return { label: 'Pracovník', variant: 'default' as const };
      case 'customer': return { label: 'Zákazník', variant: 'secondary' as const };
      case 'both': return { label: 'Oba', variant: 'outline' as const };
      default: return { label: type, variant: 'outline' as const };
    }
  };

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function getProviderLabel(provider: string) {
    switch (provider) {
      case 'google': return 'Google';
      case 'email': return 'Email';
      case 'facebook': return 'Facebook';
      default: return provider;
    }
  };

  function formatLastSignIn(date: string | null) {
    if (!date) return 'Nikdy';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
  };

  function formatDate(date: string | null) {
    if (!date) return '-';
    return format(new Date(date), 'd.M.yy', { locale: cs });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        title="Uživatelé"
        subtitle="Správa uživatelů platformy"
      />

      {/* Stats cards as Filters */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { id: 'all' as FilterTab, label: 'Celkem', value: stats.total, icon: Users },
          { id: 'workers' as FilterTab, label: 'Pracovníci', value: stats.workers, icon: Briefcase },
          { id: 'customers' as FilterTab, label: 'Zákazníci', value: stats.customers, icon: User },
          { id: 'pro' as FilterTab, label: 'PRO členové', value: stats.pro, icon: Crown },
        ].map(s => {
          const isActive = filterTab === s.id;
          return (
            <Card 
              key={s.id} 
              className={cn(
                "p-3.5 cursor-pointer transition-all border border-border bg-white dark:bg-slate-900 shadow-none",
                isActive 
                  ? "bg-slate-50 dark:bg-slate-800 ring-1 ring-primary/20" 
                  : "hover:bg-slate-50/50 hover:shadow-sm"
              )}
              onClick={() => setFilterTab(s.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                  isActive ? "border-primary/50 text-primary bg-primary/5 shadow-inner" : "border-slate-300 dark:border-slate-800 text-muted-foreground/40"
                )}>
                  <s.icon className="h-3 w-3" />
                </div>
                <p className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground opacity-60")}>{s.label}</p>
              </div>
              <p className="text-lg font-semibold tracking-tight mt-1">{s.value.toLocaleString()}</p>
            </Card>
          );
        })}
      </div>

      {/* Search Bar - Removed Tabs as requested */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Rychlé hledání v databázi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-[10px] font-medium bg-muted/40 border-border rounded-full focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          />
        </div>
        {filterTab !== 'all' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilterTab('all')}
            className="h-7 text-[10px] font-medium text-muted-foreground hover:text-foreground rounded-full"
          >
            Zrušit filtry
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-xl bg-card overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Uživatel</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Role</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Kredity</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Aktivita</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Info</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70 text-right pr-6">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'Žádní uživatelé nebyli nalezeni' : 'Žádní uživatelé'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const typeInfo = getUserTypeLabel(user.user_type);
                const isPro = isProActive(user);
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setDetailUser(user)}
                  >
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-foreground">{user.full_name}</span>
                          {user.is_admin && <Shield className="h-3 w-3 text-primary" />}
                          {isPro && <ProBadge variant="small" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-medium lowercase tracking-tight">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold text-foreground">{typeInfo.label}</span>
                        <span className="text-[9px] font-medium text-muted-foreground/50 tracking-tighter transition-all">via {getProviderLabel(user.provider)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold font-mono text-foreground">{user.wallet_points ?? user.points ?? 0}</span>
                        <span className="text-[9px] font-medium text-muted-foreground/40"> pts</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock className="h-3 w-3 opacity-40" />
                        <span>{formatLastSignIn(user.last_sign_in_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-foreground/80">{formatDate(user.created_at)}</span>
                        <span className="text-[9px] text-muted-foreground/40 font-medium tracking-tighter">reg.</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-6">
                      {user.banned ? (
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border-destructive/20 shadow-none">Ban</Badge>
                      ) : user.email_confirmed_at ? (
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 shadow-none">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-500/10 shadow-none">Wait</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/60 transition-all active:scale-95" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4 opacity-60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailUser(user); }}>
                            <User className="h-4 w-4 mr-2" />Zobrazit profil
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isPro ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openProDialog(user, 'revoke'); }}>
                              <Crown className="h-4 w-4 mr-2 text-amber-500" />Odebrat PRO
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openProDialog(user, 'grant'); }}>
                              <Crown className="h-4 w-4 mr-2 text-amber-500" />Udělit PRO
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                            setGiftAmount("");
                            setGiftDialogOpen(true);
                          }}>
                            <Gift className="h-4 w-4 mr-2" />Darovat kredity
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setBanDialogOpen(true); }}>
                            <Ban className="h-4 w-4 mr-2" />Zablokovat
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 mr-2" />Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* User detail sheet */}
      <Sheet open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detailUser && (
            <>
              <SheetHeader>
                <SheetTitle>Detail uživatele</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={detailUser.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">{getInitials(detailUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{detailUser.full_name}</h3>
                      {isProActive(detailUser) && <ProBadge variant="small" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Role', value: getUserTypeLabel(detailUser.user_type).label },
                    { label: 'Kredity', value: `${detailUser.wallet_points ?? detailUser.points ?? 0} bodů` },
                    { label: 'Registrace', value: formatDate(detailUser.created_at) },
                    { label: 'Poslední přihlášení', value: formatLastSignIn(detailUser.last_sign_in_at) },
                    { label: 'Přihlášení přes', value: getProviderLabel(detailUser.provider) },
                    { label: 'Admin', value: detailUser.is_admin ? 'Ano' : 'Ne' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* PRO section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" /> PRO členství
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {isProActive(detailUser) ? (
                      <>
                        <p className="text-emerald-600 font-medium">Aktivní</p>
                        <p className="text-muted-foreground">Od: {formatDate(detailUser.pro_since)}</p>
                        <p className="text-muted-foreground">Vyprší: {formatDate(detailUser.pro_expires_at)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => openProDialog(detailUser, 'revoke')}
                        >
                          Odebrat PRO
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">Neaktivní</p>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                          onClick={() => openProDialog(detailUser, 'grant')}
                        >
                          <Crown className="h-3.5 w-3.5 mr-1.5" /> Udělit PRO
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* Credits section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" /> Kredity a odměny
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Aktuální stav</span>
                      <span className="font-semibold text-lg text-primary">{detailUser.wallet_points ?? detailUser.points ?? 0}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => {
                        setSelectedUser(detailUser);
                        setGiftAmount("");
                        setGiftDialogOpen(true);
                      }}
                    >
                      <Gift className="h-3.5 w-3.5" /> Darovat bonusové kredity
                    </Button>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground font-mono break-all">ID: {detailUser.id}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* PRO grant/revoke dialog */}
      <Dialog open={proDialogOpen} onOpenChange={setProDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {proAction === 'grant' ? 'Udělit PRO členství' : 'Odebrat PRO členství'}
            </DialogTitle>
            <DialogDescription>
              {proAction === 'grant'
                ? `Udělit PRO členství uživateli ${selectedUser?.full_name}. Uživatel obdrží 20 bonusových kreditů.`
                : `Odebrat PRO členství uživateli ${selectedUser?.full_name}.`}
            </DialogDescription>
          </DialogHeader>
          {proAction === 'grant' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-medium">Délka členství</Label>
              <Select value={proDuration} onValueChange={setProDuration}>
                <SelectTrigger className="h-8 text-[10px] border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dní</SelectItem>
                  <SelectItem value="60">60 dní</SelectItem>
                  <SelectItem value="90">90 dní</SelectItem>
                  <SelectItem value="365">365 dní (1 rok)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProDialogOpen(false)} disabled={togglingPro}>
              Zrušit
            </Button>
            <Button
              onClick={handleTogglePro}
              disabled={togglingPro}
              className={proAction === 'grant' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' : ''}
              variant={proAction === 'revoke' ? 'destructive' : 'default'}
            >
              {togglingPro ? 'Zpracování...' : proAction === 'grant' ? 'Udělit PRO' : 'Odebrat PRO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zablokovat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete zablokovat uživatele <strong>{selectedUser?.full_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Zablokovat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat uživatele?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete trvale smazat uživatele <strong>{selectedUser?.full_name}</strong>? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Mazání...' : 'Smazat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gift Credits Dialog */}
      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-lime-500" /> Darovat kredity
            </DialogTitle>
            <DialogDescription>
              Připsat bonusové kredity uživateli <strong>{selectedUser?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="giftAmount" className="text-[10px] font-medium">Počet kreditů</Label>
              <Input
                id="giftAmount"
                type="number"
                placeholder="např. 100"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                autoFocus
                className="h-8 text-[10px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGiftDialogOpen(false)} disabled={gifting}>
              Zrušit
            </Button>
            <Button onClick={handleGiftCredits} disabled={gifting || !giftAmount.trim()}>
              {gifting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Potvrdit darování
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

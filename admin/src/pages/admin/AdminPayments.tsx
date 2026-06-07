import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Search, CreditCard, ArrowUpRight, TrendingUp, Clock, CheckCircle, XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface PaymentWithUser {
  id: string;
  user_id: string;
  points_amount: number;
  price_czk: number;
  payment_status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('points_purchases')
        .select(`
          id,
          user_id,
          points_amount,
          price_czk,
          payment_status,
          created_at,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as any) || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = payment.profiles?.full_name?.toLowerCase().includes(q);
    const emailMatch = payment.profiles?.email?.toLowerCase().includes(q);
    const idMatch = payment.id.toLowerCase().includes(q);
    return nameMatch || emailMatch || idMatch;
  });

  const stats = {
    totalRevenue: payments.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').reduce((acc, curr) => acc + curr.price_czk, 0),
    totalPoints: payments.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').reduce((acc, curr) => acc + curr.points_amount, 0),
    successfulTransactions: payments.filter(p => p.payment_status === 'paid' || p.payment_status === 'completed').length,
    pendingTransactions: payments.filter(p => p.payment_status === 'pending').length,
  };

  function getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function formatDate(date: string | null) {
    if (!date) return '-';
    return format(new Date(date), 'd.M.yy HH:mm', { locale: cs });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={CreditCard}
        title="Platby a Kredity"
        subtitle="Historie nákupů kreditů (Stripe)"
      />

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3.5 border border-border bg-white dark:bg-slate-900 shadow-none">
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-full border border-primary/50 text-primary bg-primary/5 shadow-inner flex items-center justify-center">
              <TrendingUp className="h-3 w-3" />
            </div>
            <p className="text-[10px] font-medium text-primary">Celkové tržby</p>
          </div>
          <p className="text-lg font-semibold tracking-tight mt-1">{stats.totalRevenue.toLocaleString()} Kč</p>
        </Card>
        
        <Card className="p-3.5 border border-border bg-white dark:bg-slate-900 shadow-none">
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-full border border-primary/50 text-primary bg-primary/5 shadow-inner flex items-center justify-center">
              <ArrowUpRight className="h-3 w-3" />
            </div>
            <p className="text-[10px] font-medium text-primary">Prodané kredity</p>
          </div>
          <p className="text-lg font-semibold tracking-tight mt-1">{stats.totalPoints.toLocaleString()} pts</p>
        </Card>

        <Card className="p-3.5 border border-border bg-white dark:bg-slate-900 shadow-none">
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-full border border-emerald-500/50 text-emerald-600 bg-emerald-50 shadow-inner flex items-center justify-center">
              <CheckCircle className="h-3 w-3" />
            </div>
            <p className="text-[10px] font-medium text-emerald-600">Úspěšné platby</p>
          </div>
          <p className="text-lg font-semibold tracking-tight mt-1">{stats.successfulTransactions.toLocaleString()}</p>
        </Card>

        <Card className="p-3.5 border border-border bg-white dark:bg-slate-900 shadow-none">
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-full border border-amber-500/50 text-amber-600 bg-amber-50 shadow-inner flex items-center justify-center">
              <Clock className="h-3 w-3" />
            </div>
            <p className="text-[10px] font-medium text-amber-600">Čekající platby</p>
          </div>
          <p className="text-lg font-semibold tracking-tight mt-1">{stats.pendingTransactions.toLocaleString()}</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Hledat podle jména, emailu nebo ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-[10px] font-medium bg-muted/40 border-border rounded-full focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-xl bg-card overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Uživatel</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Kredity</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Cena</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Datum</TableHead>
              <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70 text-right pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'Žádné platby nebyly nalezeny' : 'Žádné platby'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={payment.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(payment.profiles?.full_name || "")}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-foreground">
                        {payment.profiles?.full_name || "Neznámý uživatel"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 font-medium lowercase tracking-tight">
                        {payment.profiles?.email || "Bez emailu"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold font-mono text-foreground">
                        +{payment.points_amount}
                      </span>
                      <span className="text-[9px] font-medium text-muted-foreground/40"> pts</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[10px] font-semibold text-foreground">
                      {payment.price_czk.toLocaleString()} Kč
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                      <Clock className="h-3 w-3 opacity-40" />
                      <span>{formatDate(payment.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right pr-6">
                    {payment.payment_status === 'paid' || payment.payment_status === 'completed' ? (
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 shadow-none">
                        Zaplaceno
                      </Badge>
                    ) : payment.payment_status === 'pending' ? (
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-500/10 shadow-none">
                        Čeká na platbu
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border-destructive/20 shadow-none">
                        {payment.payment_status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

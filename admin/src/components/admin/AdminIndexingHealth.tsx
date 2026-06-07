import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Chrome, 
  RefreshCw, 
  Trash2, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  HelpCircle, 
  AlertCircle, 
  Info,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Globe,
  Clock
} from "lucide-react";

interface ConnectionStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

export const AdminIndexingHealth: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [exchangeStatus, setExchangeStatus] = useState<'idle' | 'exchanging' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>({
    connected: false,
    email: null,
    connectedAt: null
  });
  
  // Stats for indexing dashboard
  const [totalPages, setTotalPages] = useState<number>(0);
  const [indexedCount, setIndexedCount] = useState<number>(0);
  const [inspectedCount, setInspectedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);

  // 1. Fetch stats for indexing dashboard
  const fetchStats = async () => {
    try {
      // Total pages
      const { count: total, error: totalError } = await supabase
        .from('pages')
        .select('id', { count: 'exact', head: true });
      if (totalError) throw totalError;
      setTotalPages(total ?? 0);

      // Indexed pages count
      const { count: indexed, error: indexedError } = await supabase
        .from('pages')
        .select('gsc_indexing_status', { count: 'exact', head: true })
        .eq('gsc_indexing_status', 'Indexed');
      if (indexedError) throw indexedError;
      setIndexedCount(indexed ?? 0);

      // Inspected pages (any with a last checked timestamp)
      const { count: inspected, error: inspectedError } = await supabase
        .from('pages')
        .select('gsc_last_checked', { count: 'exact', head: true })
        .not('gsc_last_checked', 'is', null);
      if (inspectedError) throw inspectedError;
      setInspectedCount(inspected ?? 0);

      // Failed pages count (any with inspect error)
      const { count: failed, error: failedError } = await supabase
        .from('pages')
        .select('gsc_inspect_error', { count: 'exact', head: true })
        .not('gsc_inspect_error', 'is', null);
      if (failedError) throw failedError;
      setFailedCount(failed ?? 0);

      // Pending pages (total - inspected)
      setPendingCount((total ?? 0) - (inspected ?? 0));
    } catch (err: any) {
      console.error('Error fetching indexing stats:', err);
      setErrorMessage(err.message || 'Failed to fetch indexing stats.');
    }
  };

  // Fetch pages based on current filter
  const fetchPages = async () => {
    setLoadingPages(true);
    try {
      let query = supabase.from('pages').select('id, url, gsc_indexing_status, gsc_inspect_error');
      if (filterStatus === 'Indexed') {
        query = query.eq('gsc_indexing_status', 'Indexed');
      } else if (filterStatus === 'Not Indexed') {
        query = query.not('gsc_indexing_status', 'eq', 'Indexed').is('gsc_inspect_error', null);
      } else if (filterStatus === 'Failed') {
        query = query.not('gsc_inspect_error', 'is', null);
      }
      const { data, error } = await query.order('url');
      if (error) throw error;
      setPages(data || []);
    } catch (err: any) {
      console.error('Error fetching pages:', err);
      setErrorMessage(err.message || 'Failed to fetch pages.');
    } finally {
      setLoadingPages(false);
    }
  };

  // Refresh both stats and page list
  const handleRefresh = async () => {
    await Promise.all([fetchStats(), fetchPages()]);
    toast.success("Statistiky a seznam stránek byly aktualizovány");
  };

  // Utility to reset all GSC data back to unchecked status
  const handleResetAllGscData = async () => {
    if (!window.confirm('Are you sure you want to reset all Google Search Console data? This will clear all inspected statuses, crawl times, and errors for all pages in the database. This lets you run a fresh, clean scan.')) {
      return;
    }

    setResetting(true);
    setErrorMessage(null);
    setSyncResult(null);

    try {
      const { error } = await supabase
        .from('pages')
        .update({
          gsc_last_checked: null,
          gsc_indexing_status: null,
          gsc_coverage_state: null,
          gsc_robots_txt_status: null,
          gsc_last_crawl_time: null,
          gsc_inspect_error: null
        })
        .not('url', 'eq', ''); // safe global update filter matching all URLs

      if (error) throw error;

      // Reset GSC sync log from settings
      await supabase
        .from('app_settings')
        .delete()
        .eq('key', 'gsc_sync_log');

      toast.success("Všechna data Google Search Console byla resetována.");
      setSyncResult('Successfully reset all Google Search Console data. All pages are now marked as pending/unchecked.');
      await handleRefresh();
    } catch (err: any) {
      console.error('Error resetting GSC data:', err);
      setErrorMessage(err.message || 'Failed to reset Search Console data.');
      toast.error("Chyba při resetování dat");
    } finally {
      setResetting(false);
    }
  };

  // Refresh when filter changes
  useEffect(() => {
    fetchPages();
  }, [filterStatus]);

  // Update stats after connection fetch and after sync
  useEffect(() => {
    fetchStats();
  }, []);

  // Also refresh stats and page list after a successful sync trigger
  useEffect(() => {
    if (syncResult) {
      fetchStats();
      fetchPages();
    }
  }, [syncResult]);

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gsc_connection_status')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Setting not found, GSC is not connected
          setConnection({ connected: false, email: null, connectedAt: null });
        } else {
          throw error;
        }
      } else if (data && data.value) {
        const v = data.value as any;
        setConnection({
          connected: v.connected || false,
          email: v.email || null,
          connectedAt: v.connected_at || null
        });
      }
    } catch (err: any) {
      console.error('Error fetching GSC connection status:', err);
      setErrorMessage(err.message || 'Failed to fetch GSC connection status');
    } finally {
      setLoading(false);
    }
  };

  // 2. Google OAuth 2.0 Auth Redirect Trigger (with smart backend + client fallback)
  const handleConnectGoogle = async () => {
    setLoading(true);
    setErrorMessage(null);
    const redirectUri = window.location.origin + '/admin/seo-obsah';

    try {
      console.log('Attempting to fetch Google Auth URL from Edge Function (gsc-get-auth-url)...');
      const { data, error } = await supabase.functions.invoke('gsc-get-auth-url', {
        body: { redirectUri }
      });

      if (!error && data?.url) {
        console.log('Successfully retrieved Google Auth URL from Edge Function, redirecting...');
        window.location.href = data.url;
        return;
      }
      
      console.warn('Backend Edge Function failed or returned error. Falling back to client-side OAuth URL generation.', error || data?.error);
    } catch (edgeErr) {
      console.warn('Edge function invoke exception, using client fallback:', edgeErr);
    }

    // Client-side Fallback
    try {
      const clientId = import.meta.env?.VITE_GSC_OAUTH_CLIENT_ID || '';
      if (!clientId) {
        throw new Error('GSC_OAUTH_CLIENT_ID is missing in frontend env (VITE_GSC_OAUTH_CLIENT_ID) and the Edge Function was unreachable.');
      }

      console.log('Generating Google Auth URL on the client-side...');
      const scope = 'https://www.googleapis.com/auth/webmasters.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      window.location.href = authUrl;
    } catch (fallbackErr: any) {
      console.error('Both server-side and client-side auth URL generation failed:', fallbackErr);
      setErrorMessage(fallbackErr.message || 'Chyba při získávání Auth URL: Edge Function returned a non-2xx status code');
      setLoading(false);
    }
  };

  // 3. Handle Google Redirect Callback with code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stashedCode = sessionStorage.getItem('gsc_oauth_code');
    const code = stashedCode || params.get('code');

    if (code) {
      sessionStorage.removeItem('gsc_oauth_code');
      sessionStorage.removeItem('gsc_oauth_state');
      const exchangeOAuthCode = async () => {
        setExchangeStatus('exchanging');
        setLoading(true);
        const redirectUri = window.location.origin + '/admin/seo-obsah';

        try {
          // Invoke the gsc-oauth-exchange Edge Function
          const { data, error } = await supabase.functions.invoke('gsc-oauth-exchange', {
            body: { code, redirectUri }
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          setExchangeStatus('success');
          toast.success("Účet Google Search Console byl úspěšně připojen!");
          // Clean up the URL parameters so the page reload doesn't re-trigger
          window.history.replaceState({}, document.title, window.location.pathname);
          // Refresh the connection status state
          await fetchConnectionStatus();
        } catch (err: any) {
          console.error('Error exchanging code:', err);
          setExchangeStatus('error');
          setErrorMessage(err.message || 'Failed to exchange authorization code.');
          toast.error("Chyba při připojování Google účtu");
        } finally {
          setLoading(false);
        }
      };

      exchangeOAuthCode();
    } else {
      fetchConnectionStatus();
    }
  }, []);

  // 4. Disconnect Google Search Console account
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Search Console? This will delete the stored refresh token.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete the refresh token and connection status
      const { error: err1 } = await supabase
        .from('app_settings')
        .delete()
        .eq('key', 'gsc_refresh_token');

      const { error: err2 } = await supabase
        .from('app_settings')
        .update({
          value: { connected: false, email: null, connected_at: null }
        })
        .eq('key', 'gsc_connection_status');

      if (err1 || err2) throw err1 || err2;

      setConnection({ connected: false, email: null, connectedAt: null });
      setSyncResult(null);
      toast.success("Google Search Console byl úspěšně odpojen");
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      setErrorMessage(err.message || 'Failed to disconnect account');
      toast.error("Chyba při odpojování účtu");
    } finally {
      setLoading(false);
    }
  };

  // 5. Trigger Indexing Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setErrorMessage(null);
    toast.info("Spouštím synchronizaci další dávky stránek...");

    try {
      const { data, error } = await supabase.functions.invoke('gsc-index-status-sync');

      if (error) throw error;
      // The edge function always returns HTTP 200; errors are indicated via success flag
      if (data?.success === false) {
        throw new Error(data.message || 'Sync failed');
      }

      const msg = `Úspěšně synchronizováno ${data?.processedCount || 0} stránek (Úspěšně: ${data?.successCount || 0}, Chyba: ${data?.failCount || 0})`;
      toast.success(msg);
      setSyncResult(msg);
    } catch (err: any) {
      console.error('Error running sync:', err);
      setErrorMessage(err.message || 'Failed to run indexing status sync.');
      toast.error("Chyba při synchronizaci stránek");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Action Progress Overlay */}
      {exchangeStatus === 'exchanging' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-foreground">Propojování s Google Search Console. Prosím čekejte...</p>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <Alert variant="destructive" className="rounded-xl border border-destructive/20 bg-destructive/5 text-destructive p-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-[10px] font-bold uppercase tracking-wider">Chyba systému</AlertTitle>
          <AlertDescription className="text-[10px] leading-relaxed mt-0.5 flex items-center justify-between w-full">
            <span>{errorMessage}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10 rounded-md ml-4 flex-shrink-0" onClick={() => setErrorMessage(null)}>
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Indexing Stats Top Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Všechny Stránky", value: totalPages, icon: Globe, color: "text-zinc-400 dark:text-zinc-500", borderLeft: "" },
          { label: "Indexováno", value: indexedCount, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-500", borderLeft: "border-l-2 border-l-emerald-500" },
          { label: "Čekající / Neindexováno", value: Math.max(0, totalPages - indexedCount - failedCount), icon: Clock, color: "text-amber-600 dark:text-amber-500", borderLeft: "border-l-2 border-l-amber-500" },
          { label: "Selhalo", value: failedCount, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-500", borderLeft: "border-l-2 border-l-rose-500" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl bg-white dark:bg-zinc-900 ${stat.borderLeft}`}>
              <CardContent className="p-3.5 flex flex-col justify-between h-full min-h-[76px]">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">{stat.label}</span>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-black mt-2 leading-none ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pages List Card */}
      <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3 px-4 pt-4 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Seznam stránek</p>
              <CardTitle className="text-xs font-semibold text-foreground mt-0.5">
                Adresy a Stavy Indexace
              </CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
              {/* Filter Tabs/Pills */}
              <div className="flex items-center gap-0.5 p-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-full">
                {[
                  { id: 'All', label: 'Vše', count: totalPages },
                  { id: 'Indexed', label: 'Indexované', count: indexedCount },
                  { id: 'Not Indexed', label: 'Neindexované', count: Math.max(0, totalPages - indexedCount - failedCount) },
                  { id: 'Failed', label: 'Chyby', count: failedCount }
                ].map((pill) => {
                  const isActive = filterStatus === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setFilterStatus(pill.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                        isActive 
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className={`text-[8px] px-1.5 py-0.1 rounded-full ${
                        isActive 
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold" 
                          : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold"
                      }`}>
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sync Actions Group */}
              <div className="flex items-center gap-1.5">
                <Button 
                  onClick={handleTriggerSync} 
                  disabled={syncing || resetting} 
                  size="sm"
                  className="h-7 rounded-full text-[9px] font-bold active:scale-95 transition-all bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Synchronizuji...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-2.5 w-2.5 mr-1" />
                      Synchronizovat
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handleRefresh} 
                  disabled={loading || syncing || resetting} 
                  variant="outline" 
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full active:scale-95 transition-all border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  title="Obnovit data"
                >
                  <RefreshCw className="h-3 w-3 opacity-70" />
                </Button>

                <Button
                  onClick={async () => {
                    const t = toast.loading("Naplňuji pages ze sitemap…");
                    try {
                      const { data, error } = await supabase.functions.invoke("pages-sitemap-sync");
                      if (error) throw error;
                      toast.success(`Sitemap sync: +${data?.newly_inserted ?? 0} nových URL (celkem ${data?.sitemap_total ?? 0})`, { id: t });
                      fetchStats();
                      fetchPages();
                    } catch (e: any) {
                      toast.error(`Sitemap sync selhal: ${e.message ?? e}`, { id: t });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full text-[9px] font-semibold active:scale-95 transition-all border-zinc-200 dark:border-zinc-800"
                  title="Naplnit/aktualizovat pages tabulku ze sitemap_index.xml"
                >
                  <Globe className="h-2.5 w-2.5 mr-1" />
                  Sitemap → pages
                </Button>

                <Button
                  onClick={async () => {
                    if (!confirm("Odeslat všechny 'Unknown to Google' URL přes IndexNow do Bing/Seznam/Yandex/Naver? (až 2000 URL)")) return;
                    const t = toast.loading("Odesílám IndexNow…");
                    try {
                      const { data, error } = await supabase.functions.invoke("indexnow-batch-resubmit", {
                        body: { status: "URL is unknown to Google", limit: 2000 },
                      });
                      if (error) throw error;
                      toast.success(`IndexNow: odesláno ${data?.submitted ?? 0} URL v ${data?.batches ?? 0} dávkách`, { id: t });
                    } catch (e: any) {
                      toast.error(`IndexNow selhal: ${e.message ?? e}`, { id: t });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full text-[9px] font-semibold active:scale-95 transition-all border-zinc-200 dark:border-zinc-800"
                  title="Dávkově re-pingnout IndexNow pro neznámé URL"
                >
                  <ArrowRight className="h-2.5 w-2.5 mr-1" />
                  IndexNow resubmit
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleResetAllGscData}
                  disabled={syncing || resetting || loadingPages}
                  className="h-7 w-7 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
                  title="Smazat mezipaměť metadat"
                >
                  {resetting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPages ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          ) : pages.length === 0 ? (
            <div className="py-12 text-center text-[10px] text-zinc-400 dark:text-zinc-500 italic">
              Žádné stránky s tímto indexačním stavem nebyly nalezeny.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/20 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800/80">
                    <TableHead className="text-zinc-400 dark:text-zinc-500 text-[9px] uppercase font-bold tracking-wider py-2 px-4">Adresa URL (Relativní)</TableHead>
                    <TableHead className="text-zinc-400 dark:text-zinc-500 text-[9px] uppercase font-bold tracking-wider py-2 px-4 text-right">Stav Indexace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((p) => (
                    <TableRow key={p.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800/60">
                      <TableCell className="py-2 px-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <a 
                            href={p.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="group/link inline-flex items-center gap-1 font-semibold text-xs text-zinc-800 dark:text-zinc-200 hover:text-primary dark:hover:text-primary transition-colors w-fit"
                          >
                            <span>{p.url}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-zinc-400" />
                          </a>
                          {p.gsc_inspect_error && (
                            <div className="mt-0.5 text-[9px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded-md w-fit max-w-xl whitespace-pre-wrap leading-tight">
                              Chyba: {p.gsc_inspect_error}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-4 align-middle text-right">
                        <Badge 
                          variant="secondary"
                          className={`rounded-full px-2 py-0.2 text-[8px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 border ${
                            p.gsc_inspect_error 
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                              : p.gsc_indexing_status === 'Indexed'
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <span className={`h-1 w-1 rounded-full ${
                            p.gsc_inspect_error 
                              ? "bg-rose-500"
                              : p.gsc_indexing_status === 'Indexed'
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-amber-500"
                          }`} />
                          {p.gsc_inspect_error ? 'Chyba' : (p.gsc_indexing_status || 'Neindexováno')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side-by-side setup & guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Connection Status Card */}
        <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl overflow-hidden bg-white dark:bg-zinc-900 flex flex-col">
          <CardHeader className="flex flex-row items-start gap-3 pb-3 px-4 pt-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center flex-shrink-0">
              <Chrome className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Nastavení Připojení</p>
              <CardTitle className="text-xs font-semibold text-foreground mt-0.5">
                Google Search Console API
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {loading && exchangeStatus !== 'exchanging' ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ) : connection.connected ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.2 text-[8px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                    Aktivní Připojení
                  </Badge>
                </div>
                
                <div className="grid gap-2 p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex justify-between items-center text-[10px] pb-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Google Účet</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">{connection.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Připojeno</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString('cs-CZ') : 'Neuvedeno'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={handleTriggerSync} 
                    disabled={syncing}
                    size="sm"
                    className="h-8 rounded-full text-[10px] font-bold active:scale-95 transition-all bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    {syncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Synchronizovat'
                    )}
                  </Button>
                  <Button 
                    onClick={handleDisconnect} 
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-[10px] font-bold active:scale-95 transition-all border-zinc-200 dark:border-zinc-800 hover:bg-red-500/5 text-red-500 dark:text-red-400 border-red-500/10 dark:border-red-500/10"
                  >
                    Odpojit Google
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full px-2 py-0.2 text-[8px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    Nepřipojeno
                  </Badge>
                </div>
                <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Umožňuje bezpečné stahování offline indexačních statistik z Google Search Console API.
                </p>
                <Button onClick={handleConnectGoogle} size="sm" className="h-8 rounded-full text-[10px] font-bold active:scale-95 transition-all bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 w-fit">
                  Připojit účet Google
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help / Guide Card */}
        <Card className="border-zinc-200 dark:border-zinc-800/80 shadow-none rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-2.5">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              Průvodce Propojením Google OAuth 2.0
            </h4>
            <ol className="list-decimal pl-4 text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1.5 leading-normal">
              <li>Klikněte na <strong>Připojit účet Google</strong> pro přesměrování.</li>
              <li>Vyberte Google účet, který vlastní danou doménu v <strong>GSC</strong>.</li>
              <li>Udělte povolení ke čtení dat z vyhledávací konzole a pokračujte.</li>
              <li>Systém si bezpečně uloží offline token a zprovozní automatické kontroly.</li>
            </ol>
          </div>
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-800/60 pt-2 mt-2 italic flex items-center gap-1">
            <Info className="h-3 w-3" />
            Automatický synchronizační cron běží v pozadí každé 2 minuty.
          </div>
        </Card>
      </div>

    </div>
  );
};

export default AdminIndexingHealth;

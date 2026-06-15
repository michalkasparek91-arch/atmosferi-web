import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ComposableMap, 
  Geographies, 
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Loader2, Globe2, Users2, Zap, LayoutDashboard } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map Czech country names to ISO-A3 codes
const czToIso3: Record<string, string> = {
  "Česko": "CZE", "Česká republika": "CZE", "Slovensko": "SVK", "Rakousko": "AUT", 
  "Německo": "DEU", "Polsko": "POL", "Maďarsko": "HUN", "Spojené státy": "USA", 
  "USA": "USA", "Velká Británie": "GBR", "Francie": "FRA", "Itálie": "ITA",
  "Španělsko": "ESP", "Švýcarsko": "CHE", "Austrálie": "AUS", "Kanada": "CAN", 
  "Irsko": "IRL", "Nizozemsko": "NLD", "Belgie": "BEL", "Švédsko": "SWE", 
  "Norsko": "NOR", "Dánsko": "DNK", "Finsko": "FIN", "Portugalsko": "PRT",
  "Spojené arabské emiráty": "ARE", "Izrael": "ISR", "Japonsko": "JPN", "Čína": "CHN",
  "Indie": "IND", "Brazílie": "BRA", "Mexiko": "MEX", "Jižní Afrika": "ZAF",
  "Rusko": "RUS", "Turecko": "TUR", "Řecko": "GRC", "Chorvatsko": "HRV"
};

export default function AdminAnalytics() {
  const { data: countryStats, isLoading: countriesLoading } = useQuery({
    queryKey: ['analytics-countries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('analytics_country_stats').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: categoryStats, isLoading: categoriesLoading } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('analytics_category_stats').select('*');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = countriesLoading || categoriesLoading;

  // Compute color scale for map based on max contacts
  const maxContacts = useMemo(() => {
    if (!countryStats) return 1;
    return Math.max(...countryStats.map(s => s.total_contacts), 1);
  }, [countryStats]);

  const colorScale = scaleLinear<string>()
    .domain([0, maxContacts])
    .range(["#f4f4f5", "#0ea5e9"]); // zinc-100 to sky-500

  // Total summary metrics
  const totalContacts = useMemo(() => countryStats?.reduce((acc, curr) => acc + curr.total_contacts, 0) || 0, [countryStats]);
  const totalEnriched = useMemo(() => countryStats?.reduce((acc, curr) => acc + curr.ai_enriched, 0) || 0, [countryStats]);
  const avgEngagement = useMemo(() => {
    const totalEng = countryStats?.reduce((acc, curr) => acc + curr.total_engagement, 0) || 0;
    return totalContacts > 0 ? (totalEng / totalContacts).toFixed(1) : "0.0";
  }, [countryStats, totalContacts]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8 text-sky-500" />
          Statistiky a Analytika
        </h1>
        <p className="text-muted-foreground">Detailní přehled o Vaší databázi kontaktů z celého světa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Celkem Kontaktů</CardTitle>
            <Users2 className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalContacts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Lidí a firem v databázi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zpracováno AI</CardTitle>
            <Zap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalEnriched.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Kontaktů má dohledané weby a zprávy</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Průměrná Aktivita</CardTitle>
            <Globe2 className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{avgEngagement}</div>
            <p className="text-xs text-muted-foreground mt-1">Průměrný Engagement Score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-0 shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-sky-500" />
              Mapa Světa
            </CardTitle>
            <CardDescription>Hustota kontaktů podle cílových zemí</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative min-h-[400px]">
            <ComposableMap 
              projection="geoMercator" 
              projectionConfig={{ scale: 100 }}
              className="w-full h-full object-cover"
            >
              <ZoomableGroup center={[0, 40]} zoom={1} maxZoom={5}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      // Find matching country stats
                      const iso3 = geo.id || geo.properties.ISO_A3;
                      const stat = countryStats?.find(s => czToIso3[s.country] === iso3);
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={stat ? colorScale(stat.total_contacts) : "#f4f4f5"}
                          stroke="#d4d4d8"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#f43f5e", outline: "none", transition: "all 250ms" },
                            pressed: { fill: "#be123c", outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 rounded-2xl border border-border/50 text-xs shadow-xl">
              <h4 className="font-bold mb-2">TOP 5 Zemí:</h4>
              <div className="space-y-1.5">
                {countryStats?.sort((a,b) => b.total_contacts - a.total_contacts).slice(0, 5).map(s => (
                  <div key={s.country} className="flex justify-between items-center">
                    <span className="font-medium">{s.country}</span>
                    <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-0.5 rounded-md font-bold">{s.total_contacts}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border/50 shadow-sm flex flex-col">
          <CardHeader className="shrink-0">
            <CardTitle>Rozložení Kategorí</CardTitle>
            <CardDescription>Počty firem v jednotlivých oborech</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryStats?.sort((a,b) => b.total_contacts - a.total_contacts) || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }}
                  width={120}
                />
                <RechartsTooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="total_contacts" 
                  fill="#0ea5e9" 
                  radius={[0, 6, 6, 0]} 
                  barSize={24}
                  name="Počet kontaktů"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

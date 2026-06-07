import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * GeneratePseoButton Component
 * 
 * A clean, admin-dashboard card component that triggers the 'generate-high-intent-batch'
 * Supabase Edge Function to manually process PSEO landing page generation.
 */
const GeneratePseoButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ 
    type: null, 
    message: '' 
  });

  const handleGenerateBatch = async () => {
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      // Invoke the Edge Function with a chunk limit of 10
      const { data, error } = await supabase.functions.invoke('generate-high-intent-batch', {
        body: { limit: 10, offset: 0 }
      });

      if (error) throw error;

      const processedCount = data?.processed || 0;
      const succeededCount = data?.results?.filter((r: any) => r.status === 'success').length || 0;
      
      setStatus({
        type: 'success',
        message: `Úspěch! Zpracováno ${processedCount} kombinací. Nově vygenerováno: ${succeededCount}.`
      });
    } catch (err: any) {
      console.error('PSEO generation failed:', err);
      setStatus({
        type: 'error',
        message: `Chyba: ${err.message || 'Nepodařilo se spustit generování.'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm max-w-md">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Manuální PSEO Generátor
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Spustí "Big Bang" generování pro top 10 měst a 20 kategorií. Generuje 10 stránek na jedno kliknutí.
      </p>
      
      <button
        onClick={handleGenerateBatch}
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
          isLoading 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-200 dark:shadow-none'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-zinc-400 dark:text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generuji...
          </>
        ) : (
          'Spustit dávku (10x)'
        )}
      </button>

      {status.type && (
        <div className={`mt-4 p-4 rounded-xl text-sm leading-relaxed border ${
          status.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/50' 
            : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-100 dark:border-red-800/50'
        }`}>
          <div className="flex gap-3">
            <span className="flex-shrink-0">
              {status.type === 'success' ? '✅' : '❌'}
            </span>
            <span>{status.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratePseoButton;

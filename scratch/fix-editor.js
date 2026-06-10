const fs = require('fs');
const file = 'admin/src/components/admin/email/ModularEmailEditor.tsx';
let text = fs.readFileSync(file, 'utf8');

// 1. Zrobee Logo (Standard & Magazine Layouts)
text = text.replace(
  /<div \s*style=\{\{\s*height: '28px',\s*width: '124px',\s*backgroundColor: isDark \? '#a6d16f' : '#213319',\s*maskImage: 'url\(https:\/\/zrobee\.cz\/zrobee-logo\.svg\)',\s*WebkitMaskImage: 'url\(https:\/\/zrobee\.cz\/zrobee-logo\.svg\)',\s*maskSize: 'contain',\s*WebkitMaskSize: 'contain',\s*maskRepeat: 'no-repeat',\s*WebkitMaskRepeat: 'no-repeat',\s*maskPosition: 'center',\s*WebkitMaskPosition: 'center',\s*display: 'inline-block'\s*\}\}\s*\/>/g,
  '<div className={`font-sans font-bold text-2xl tracking-tight leading-none ${isDark ? "text-white" : "text-black"}`}>\n            Atmosferi<sup className="text-[0.5em] font-medium" style={{ top: "-0.7em", position: "relative" }}>°</sup>\n          </div>'
);

// 2. Buttons
text = text.replace(
  /<div className="inline-block px-8 py-3\.5 rounded-full font-semibold text-\[16px\] bg-\[#a6d16f\] text-\[#121210\] shadow-\[0_4px_14px_0_rgba\(166,209,111,0\.39\)\] cursor-pointer\">\s*\{previewReplace\(form\.cta_text\)\}\s*<\/div>/g,
  '<div className={`inline-flex items-center justify-center gap-3 px-[28px] py-[18px] border font-mono text-[13px] uppercase tracking-[0.08em] cursor-pointer transition-colors ${isDark ? "bg-white text-black border-white hover:bg-black hover:text-white" : "bg-black text-white border-black hover:bg-white hover:text-black"}`}>\n              {previewReplace(form.cta_text)} <span className="transition-transform hover:translate-x-1.5">→</span>\n            </div>'
);

text = text.replace(
  /<div className="inline-block bg-\[#a6d16f\] hover:bg-\[#95c05e\] text-\[#213319\] font-bold px-8 py-3 rounded-full text-center text-\[13px\] shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-98\">\s*\{previewReplace\(form\.cta_text \|\| "Zobrazit a podat nabídku"\)\}\s*<\/div>/g,
  '<div className={`inline-flex items-center justify-center gap-3 px-[28px] py-[18px] border font-mono text-[13px] uppercase tracking-[0.08em] cursor-pointer transition-colors ${isDark ? "bg-white text-black border-white hover:bg-black hover:text-white" : "bg-black text-white border-black hover:bg-white hover:text-black"}`}>\n            {previewReplace(form.cta_text || "Zobrazit a podat nabídku")} <span className="transition-transform hover:translate-x-1.5">→</span>\n          </div>'
);

// 3. Sharp Edges (Hero Image, Carousel, Articles, etc.)
// Hero Image: aspect-[16/9] w-full rounded-2xl
text = text.replace(
  /className=\{`relative aspect-\[16\/9\] w-full rounded-2xl overflow-hidden border shadow-sm group \$\{/g,
  'className={`relative aspect-[16/9] w-full overflow-hidden border shadow-sm group ${'
);
// Carousel: aspect-[16/9] w-full rounded-2xl
text = text.replace(
  /className=\{`relative aspect-\[16\/9\] w-full rounded-2xl overflow-hidden border shadow-md group select-none \$\{/g,
  'className={`relative aspect-[16/9] w-full overflow-hidden border shadow-md group select-none ${'
);
// Job Card: border rounded-2xl
text = text.replace(
  /className=\{`border rounded-2xl overflow-hidden shadow-md text-left max-w-\[500px\] mx-auto transition-transform hover:scale-\[1\.01\] \$\{/g,
  'className={`border overflow-hidden shadow-md text-left max-w-[500px] mx-auto transition-transform hover:scale-[1.01] ${'
);
// Job Card badge: rounded-br-2xl
text = text.replace(
  /className=\{`px-4 py-2 inline-flex items-center gap-2 rounded-br-2xl/g,
  'className={`px-4 py-2 inline-flex items-center gap-2'
);
// Urgency banner: rounded-2xl
text = text.replace(
  /className=\{`rounded-2xl p-4 text-xs/g,
  'className={`p-4 text-xs'
);
// Promo banner: rounded-2xl
text = text.replace(
  /className=\{`border border-dashed rounded-2xl p-4 text-xs/g,
  'className={`border border-dashed p-4 text-xs'
);
// Articles: aspect-[4/3] rounded-xl
text = text.replace(
  /className=\{`aspect-\[4\/3\] rounded-xl overflow-hidden/g,
  'className={`aspect-[4/3] overflow-hidden'
);

// 4. Text Replacements (Zrobee -> Atmosferi)
text = text.replace(/© \{new Date\(\)\.getFullYear\(\)\} Zrobee/g, '© {new Date().getFullYear()} Atmosferi');
text = text.replace(/Protože Zrobee právě/g, 'Protože Atmosferi právě');
text = text.replace(/Zrobee <noreply/g, 'Atmosferi <noreply');
text = text.replace(/Zrobee Info/g, 'Atmosferi Info');
text = text.replace(/Zrobee Podpora/g, 'Atmosferi Podpora');
text = text.replace(/z platformy Zrobee/g, 'z platformy Atmosferi');
text = text.replace(/© 2026 Zrobee/g, '© 2026 Atmosferi');

fs.writeFileSync(file, text, 'utf8');
console.log('Replacements complete');

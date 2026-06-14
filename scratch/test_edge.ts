const url = "https://paryiowezqlnffanxtnt.supabase.co/functions/v1/send-template-test";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnlpb3dlenFsbmZmYW54dG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzM3MzYsImV4cCI6MjA5NjQwOTczNn0.yyd-pRRXds1o8lU9mVWk21zu-5l_dcdxiBjDSKfKw5o";

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${anonKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    slug: "custom",
    targetEmail: "michal.kasparek91@gmail.com",
    overrideData: { name: "Test" }
  })
});

const text = await res.text();
console.log(`STATUS: ${res.status}`);
console.log(`RESPONSE: ${text}`);

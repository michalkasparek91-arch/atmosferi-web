export const triggerConfetti = () => {
  if (typeof window === 'undefined') return;

  if (!(window as any).confetti) {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js";
    script.onload = () => {
      (window as any).confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFF', '#10B981']
      });
    };
    document.body.appendChild(script);
  } else {
    (window as any).confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFF', '#10B981']
    });
  }
};

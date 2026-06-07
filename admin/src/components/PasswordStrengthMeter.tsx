import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: "Slabé", color: "bg-red-500" };
    if (score <= 2) return { score: 2, label: "Průměrné", color: "bg-orange-400" };
    if (score <= 3) return { score: 3, label: "Dobré", color: "bg-yellow-400" };
    if (score <= 4) return { score: 4, label: "Silné", color: "bg-emerald-400" };
    return { score: 5, label: "Velmi silné", color: "bg-emerald-600" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
};

export default PasswordStrengthMeter;

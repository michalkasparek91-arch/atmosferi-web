export { BadgeIcon } from "./BadgeIcon";
export { BadgeCard, type BadgeData } from "./BadgeCard";
export { WorkerBadgesSection } from "./WorkerBadgesSection";
export { NewBadgeToast } from "./NewBadgeToast";

// Mock data for preview/development
export const BADGES_DATA: import("./BadgeCard").BadgeData[] = [
  {
    id: '1',
    name: 'První krok',
    description: 'Dokončena první zakázka',
    icon: 'footprints',
    category: 'experience',
    earned: true
  },
  {
    id: '2',
    name: '5 Hvězd',
    description: '5 hvězdičkových hodnocení v řadě',
    icon: 'star',
    category: 'quality',
    earned: true
  },
  {
    id: '3',
    name: 'Blesk',
    description: 'Průměrná odpověď do 30 minut',
    icon: 'zap',
    category: 'quality',
    earned: true
  },
  {
    id: '4',
    name: 'Mistr řemesla',
    description: 'Dokončeno 50+ zakázek',
    icon: 'trophy',
    category: 'experience',
    earned: false
  },
  {
    id: '5',
    name: 'Ověřená identita',
    description: 'Nahrány doklady totožnosti',
    icon: 'shield-check',
    category: 'trust',
    earned: false
  }
];

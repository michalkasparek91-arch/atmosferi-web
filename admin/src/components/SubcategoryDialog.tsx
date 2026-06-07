// SubcategoryDialog - Updated images for Instalatér category
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ChevronDown, Wrench, Circle, Zap, Car, Settings, Bike, Wifi, Sun, Hammer, Square, Grid3X3, Layers, Paintbrush, Building, DoorOpen, Home, HardHat, KeyRound, Sofa, TreeDeciduous, Building2, Leaf, Monitor, Smartphone, Tv, Dog, Baby, HeartHandshake, Calculator, Handshake, Scale, Megaphone, ClipboardList, Printer, Languages, GraduationCap, Palette, Award, FileText, Scissors, Sparkles, Hand, Heart, Dumbbell, Cake, Music, Camera, Truck, Fence, Trash2, Cpu, Network, Brain, Newspaper, PhoneCall, Users, Watch, Gem, Apple, ArrowUpCircle, Navigation, Code, Plane } from "lucide-react";
import tireChangeBg from "@/assets/tire-change-bg.webp";
import houseConstructionBg from "@/assets/house-construction-bg.webp";
import facadeInstallationBg from "@/assets/facade-installation-bg.webp";
import tileLayingBg from "@/assets/tile-laying-bg.webp";
import photographerBg from "@/assets/photographer-bg.webp";
import cateringBg from "@/assets/catering-bg.webp";
import applianceRepairBg from "@/assets/appliance-repair-bg.webp";
import furnitureAssemblyBg from "@/assets/furniture-assembly-bg.webp";
import architectBg from "@/assets/architect-bg.webp";
import interiorDesignBg from "@/assets/interior-design-bg.webp";
import wardrobeBg from "@/assets/wardrobe-bg.webp";
import hairdresserBg from "@/assets/hairdresser-bg.webp";
import manicureBg from "@/assets/manicure-bg.webp";
import personalTrainerBg from "@/assets/personal-trainer-bg.webp";
import massageBg from "@/assets/massage-bg.webp";
import carBuyingBg from "@/assets/car-buying-bg.webp";
import wallPaintingBg from "@/assets/wall-painting-bg.webp";
import plumbingBg from "@/assets/plumbing-bg.webp";
import bathroomBg from "@/assets/bathroom-renovation-bg.webp";
import parquetSandingBg from "@/assets/parquet-sanding-bg.webp";
import movingBg from "@/assets/moving-service-bg.webp";
import cleaningBg from "@/assets/cleaning-service-bg.webp";
import windowCleaningBg from "@/assets/window-cleaning-bg.webp";
import gardenDesignBg from "@/assets/garden-design-bg.webp";
import pavingStonesBg from "@/assets/paving-stones-bg.webp";
import lawnInstallationBg from "@/assets/lawn-installation-bg.webp";
import courierBg from "@/assets/courier-bg.webp";
import passengerTransportBg from "@/assets/passenger-transport-bg.webp";
import handymanBg from "@/assets/handyman-bg.webp";
import sanitaryInstallationBg from "@/assets/sanitary-installation-bg.webp";
import furnitureRestorationBg from "@/assets/furniture-restoration-bg.webp";
import englishLessonBg from "@/assets/english-lesson-bg.webp";
import translationBg from "@/assets/translation-bg.webp";
import notaryBg from "@/assets/notary-bg.webp";
import accountingBg from "@/assets/accounting-bg.webp";
import carInsuranceBg from "@/assets/car-insurance-bg.webp";
import carLeasingBg from "@/assets/car-leasing-bg.webp";
import videographerBg from "@/assets/videographer-bg.webp";
import eventPlanningBg from "@/assets/event-planning-bg.webp";
import freightTransportBg from "@/assets/freight-transport-bg.webp";
import wasteDisposalBg from "@/assets/waste-disposal-bg.webp";
import treeCuttingBg from "@/assets/tree-cutting-bg.webp";
import electricalBg from "@/assets/electrical-bg.webp";
import roofingBg from "@/assets/roofing-bg.webp";
import autoMechanicBg from "@/assets/auto-mechanic-bg.webp";
import interiorRenovationBg from "@/assets/interior-renovation-bg.webp";
import carDiagnosticBg from "@/assets/car-diagnostic-bg.webp";
import carAnnualServiceBg from "@/assets/car-annual-service-bg.webp";
import pneuservisBg from "@/assets/pneuservis-bg.webp";
import wheelBalancingBg from "@/assets/wheel-balancing-bg.webp";
import carBatteryBg from "@/assets/car-battery-bg.webp";
import autoElectricianBg from "@/assets/auto-electrician-bg.webp";
import autoBodyBg from "@/assets/auto-body-bg.webp";
import windshieldBg from "@/assets/windshield-bg.webp";
import carDetailingBg from "@/assets/car-detailing-bg.webp";
import motorcycleMechanicBg from "@/assets/motorcycle-mechanic-bg.webp";
import motorcycleServiceBg from "@/assets/motorcycle-service-bg.webp";
import motorcycleTireBg from "@/assets/motorcycle-tire-bg.webp";
import carAcServiceBg from "@/assets/car-ac-service-bg.webp";
import carPaintingBg from "@/assets/car-painting-bg.webp";
import autoPainterBg from "@/assets/auto-painter-bg.webp";
import towServiceBg from "@/assets/tow-service-bg.webp";
import elektroInstallationBg from "@/assets/elektro-installation-bg.webp";
import elektroDiagnostikaBg from "@/assets/elektro-diagnostika-bg.webp";
import elektroPohotovostBg from "@/assets/elektro-pohotovost-bg.webp";
import wifiNetworkBg from "@/assets/wifi-network-bg.webp";
import wifiRouterBg from "@/assets/wifi-router-bg.webp";
import alarmMontazBg from "@/assets/alarm-montaz-bg.webp";
import alarmSecurityBg from "@/assets/alarm-security-bg.webp";
import solarPanelBg from "@/assets/solar-panel-bg.webp";
import fveInstalaceBg from "@/assets/fve-instalace-bg.webp";
import fveServisBg from "@/assets/fve-servis-bg.webp";
import plumbingGeneralBg from "@/assets/plumbing-general-bg.v3.webp";
import waterLeakDetectionBg from "@/assets/water-leak-detection-bg.v3.webp";
import plumbingEmergencyBg from "@/assets/plumbing-emergency-bg.v2.webp";
import heatingBoilerBg from "@/assets/heating-boiler-bg.webp";
import heatingRadiatorBg from "@/assets/heating-radiator-bg.webp";
import gasStoveBg from "@/assets/gas-stove-bg.webp";
import gasRevisionBg from "@/assets/gas-revision-bg.v3.webp";
import boilerServiceBg from "@/assets/boiler-service-bg.webp";
import gasStoveConnectionBg from "@/assets/gas-stove-connection-bg.webp";
import faucetInstallationBg from "@/assets/faucet-installation-bg.webp";
import toiletInstallationBg from "@/assets/toilet-installation-bg.webp";
import sinkDrainBg from "@/assets/sink-drain-bg.webp";
import geberitInstallationBg from "@/assets/geberit-installation-bg.webp";
import bathtubShowerBg from "@/assets/bathtub-shower-bg.webp";
import siliconeSealingBg from "@/assets/silicone-sealing-bg.webp";
import waterValveBg from "@/assets/water-valve-bg.webp";
import leakyFaucetBg from "@/assets/leaky-faucet-bg.webp";
import washingMachineBg from "@/assets/washing-machine-bg.webp";
import drainCleaningBg from "@/assets/drain-cleaning-bg.webp";
import waterPipesBg from "@/assets/water-pipes-bg.webp";
import waterMeterBg from "@/assets/water-meter-bg.webp";
import masonBg from "@/assets/mason-bg.webp";
import drywallBg from "@/assets/drywall-bg.webp";
import tilerBg from "@/assets/tiler-bg.webp";
import flooringBg from "@/assets/flooring-bg.webp";
import painterRoomBg from "@/assets/painter-room-bg.webp";
import facadeInsulationBg from "@/assets/facade-insulation-bg.webp";
import windowInstallationBg from "@/assets/window-installation-bg.webp";
import rooferBg from "@/assets/roofer-bg.webp";
import excavationBg from "@/assets/excavation-bg.webp";
// New Stavby/Rekonstrukce unique images
import masonPartitionBg from "@/assets/mason-partition-bg.webp";
import plasterCoatBg from "@/assets/plaster-coat-bg.webp";
import drywallCeilingBg from "@/assets/drywall-ceiling-bg.webp";
import drywallPartitionBg from "@/assets/drywall-partition-bg.webp";
import floorTilesBg from "@/assets/floor-tiles-bg.webp";
import wallTilesBathroomBg from "@/assets/wall-tiles-bathroom-bg.webp";
import lamFloorBg from "@/assets/laminate-floor-bg.webp";
import vinylFloorBg from "@/assets/vinyl-floor-bg.webp";
import roomPaintingWhiteBg from "@/assets/room-painting-white-bg.webp";
import roomPaintingColorBg from "@/assets/room-painting-color-bg.webp";
import windowMountingBg from "@/assets/window-mounting-bg.webp";
import windowAdjustmentBg from "@/assets/window-adjustment-bg.webp";
import doorInstallationBg from "@/assets/door-installation-bg.webp";
import facadeThermalBg from "@/assets/facade-thermal-bg.webp";
import scaffoldingBg from "@/assets/scaffolding-bg.webp";
import roofTilesBg from "@/assets/roof-tiles-bg.webp";
import roofRepairBg from "@/assets/roof-repair-bg.webp";
import excavatorTrenchBg from "@/assets/excavator-trench-bg.webp";
import manualExcavationBg from "@/assets/manual-excavation-bg.webp";
// Zámečník images
import railingInstallationBg from "@/assets/railing-installation-bg.webp";
import metalFenceGateBg from "@/assets/metal-fence-gate-bg.webp";
import weldingRepairBg from "@/assets/welding-repair-bg.webp";
import lockReplacementBg from "@/assets/lock-replacement-bg.webp";
import emergencyLocksmithBg from "@/assets/emergency-locksmith-bg.webp";
import metalStaircaseBg from "@/assets/metal-staircase-bg.webp";
import metalShelterBg from "@/assets/metal-shelter-bg.webp";
import securityHardwareBg from "@/assets/security-hardware-bg.webp";
import metalGateInstallationBg from "@/assets/metal-gate-installation-bg.webp";
import locksmithGeneralBg from "@/assets/locksmith-general-bg.webp";
// Mazlíčci images
import dogGroomingBg from "@/assets/dog-grooming-bg.webp";
import dogWalkingBg from "@/assets/dog-walking-bg.webp";
import petSittingBg from "@/assets/pet-sitting-bg.webp";
import dogTrainingBg from "@/assets/dog-training-bg.webp";
import dogHotelBg from "@/assets/dog-hotel-bg.webp";
import dogBathingBg from "@/assets/dog-bathing-bg.webp";
import dogNailTrimBg from "@/assets/dog-nail-trim-bg.webp";
import dogPhysiotherapyBg from "@/assets/dog-physiotherapy-bg.webp";
// New prominent images - batch 1
import customFurnitureBg from "@/assets/custom-furniture-bg.webp";
import legalServicesBg from "@/assets/legal-services-bg.webp";
import propertyManagementBg from "@/assets/property-management-bg.webp";
import printingServicesBg from "@/assets/printing-services-bg.webp";
import waterDispenserBg from "@/assets/water-dispenser-bg.webp";
import propertyValuatorBg from "@/assets/property-valuator-bg.webp";
import corporateEventBg from "@/assets/corporate-event-bg.webp";
import kidsAnimatorBg from "@/assets/kids-animator-bg.webp";
import weddingCakeBg from "@/assets/wedding-cake-bg.webp";
import weddingPhotographyBg from "@/assets/wedding-photography-bg.webp";
import weddingCarBg from "@/assets/wedding-car-bg.webp";
import weddingBandBg from "@/assets/wedding-band-bg.webp";
// New prominent images - batch 2
import limousineRentalBg from "@/assets/limousine-rental-bg.webp";
import minibusRentalBg from "@/assets/minibus-rental-bg.webp";
import insuranceAgentBg from "@/assets/insurance-agent-bg.webp";
import buildingInspectorBg from "@/assets/building-inspector-bg.webp";
import cargoTransportBg from "@/assets/cargo-transport-bg.webp";
import lawnMowingBg from "@/assets/lawn-mowing-bg.webp";
import hedgeTrimmingBg from "@/assets/hedge-trimming-bg.webp";
import terraceConstructionBg from "@/assets/terrace-construction-bg.webp";
import irrigationSystemBg from "@/assets/irrigation-system-bg.webp";
import sofaCleaningBg from "@/assets/sofa-cleaning-bg.webp";
import mattressCleaningBg from "@/assets/mattress-cleaning-bg.webp";
import pressureWashingBg from "@/assets/pressure-washing-bg.webp";
// New prominent images - batch 3
import poolCleaningBg from "@/assets/pool-cleaning-bg.webp";
import disinfectionBg from "@/assets/disinfection-bg.webp";
import postRenovationCleaningBg from "@/assets/post-renovation-cleaning-bg.webp";
import germanLessonBg from "@/assets/german-lesson-bg.webp";
import mathTutoringBg from "@/assets/math-tutoring-bg.webp";
import pianoLessonBg from "@/assets/piano-lesson-bg.webp";
import guitarLessonBg from "@/assets/guitar-lesson-bg.webp";
import eyelashExtensionBg from "@/assets/eyelash-extension-bg.webp";
import permanentMakeupBg from "@/assets/permanent-makeup-bg.webp";
import pedicureBg from "@/assets/pedicure-bg.webp";
import nutritionistBg from "@/assets/nutritionist-bg.webp";
import yogaClassBg from "@/assets/yoga-class-bg.webp";
// New category images - batch 4
import masonBricklayerBg from "@/assets/mason-bricklayer-bg.webp";
import constructionLaborerBg from "@/assets/construction-laborer-bg.webp";
import flooringInstallerBg from "@/assets/flooring-installer-bg.webp";
import rooferTilerBg from "@/assets/roofer-tiler-bg.webp";
import windowDoorInstallerBg from "@/assets/window-door-installer-bg.webp";
import facadeWorkerBg from "@/assets/facade-worker-bg.webp";
import drywallInstallerBg from "@/assets/drywall-installer-bg.webp";
import plumberServiceBg from "@/assets/plumber-service-bg.webp";
import mensHaircutBg from "@/assets/mens-haircut-bg.webp";
import womensHaircutBg from "@/assets/womens-haircut-bg.webp";
import beauticianBg from "@/assets/beautician-bg.webp";
import facialCleansingBg from "@/assets/facial-cleansing-bg.webp";
import eyebrowLashBg from "@/assets/eyebrow-lash-bg.webp";
// New images - Další služby category
import tailorBg from "@/assets/tailor-bg.webp";
import shoeRepairBg from "@/assets/shoe-repair-bg.webp";
import lawyerBg from "@/assets/lawyer-bg.webp";
import legalServicesBg2 from "@/assets/legal-services-bg.webp";
import nannyBg from "@/assets/nanny-bg.webp";
import wallDrillingBg from "@/assets/wall-drilling-bg.webp";
import curtainRodBg from "@/assets/curtain-rod-bg.webp";
// New images - batch 5 (various categories)
import manicurePedicureBg from "@/assets/manicure-pedicure-bg.webp";
import massageTherapistBg from "@/assets/massage-therapist-bg.webp";
import physiotherapyRehabBg from "@/assets/physiotherapy-rehab-bg.webp";
import languageTeacherBg from "@/assets/language-teacher-bg.webp";
import nativeSpeakerBg from "@/assets/native-speaker-bg.webp";
import tutoringPrivateBg from "@/assets/tutoring-private-bg.webp";
import musicArtTeacherBg from "@/assets/music-art-teacher-bg.webp";
import translatorBg from "@/assets/translator-bg.webp";
import courtTranslatorBg from "@/assets/court-translator-bg.webp";
import textTranslationBg from "@/assets/text-translation-bg.webp";
import houseCleanerBg from "@/assets/house-cleaner-bg.webp";
import regularCleaningBg from "@/assets/regular-cleaning-bg.webp";
import deepCleaningBg from "@/assets/deep-cleaning-bg.webp";
import carpetSofaCleaningBg from "@/assets/carpet-sofa-cleaning-bg.webp";
import carpetSteamCleaningBg from "@/assets/carpet-steam-cleaning-bg.webp";
import sofaSteamCleaningBg from "@/assets/sofa-steam-cleaning-bg.webp";
import outdoorCleaningBg from "@/assets/outdoor-cleaning-bg.webp";
import pressureWashFacadeBg from "@/assets/pressure-wash-facade-bg.webp";
import gutterCleaningProfessionalBg from "@/assets/gutter-cleaning-professional-bg.webp";
import officeCleaningCompanyBg from "@/assets/office-cleaning-company-bg.webp";
import apartmentClearanceBg from "@/assets/apartment-clearance-bg.webp";
import pianoKeyboardLessonBg from "@/assets/piano-keyboard-lesson-bg.webp";
import guitarLessonProfessionalBg from "@/assets/guitar-lesson-professional-bg.webp";
import professionalCourseBg from "@/assets/professional-course-bg.webp";
import drivingPracticeBg from "@/assets/driving-practice-bg.webp";
import accountingCourseBg from "@/assets/accounting-course-bg.webp";
// New images - batch 8b (Výuka a jazyky)
import spanishLessonBg from "@/assets/spanish-lesson-bg.webp";
import frenchLessonBg from "@/assets/french-lesson-bg.webp";
import czechTutoringBg from "@/assets/czech-tutoring-bg.webp";
import physicsChemistryBg from "@/assets/physics-chemistry-bg.webp";
import examPrepBg from "@/assets/exam-prep-bg.webp";
import safetyTrainingBg from "@/assets/safety-training-bg.webp";
import firstAidTrainingBg from "@/assets/first-aid-training-bg.webp";
import computerCourseBg from "@/assets/computer-course-bg.webp";
import drawingPaintingCourseBg from "@/assets/drawing-painting-course-bg.webp";
import ceramicsCourseBg from "@/assets/ceramics-course-bg.webp";
import sewingCourseBg from "@/assets/sewing-course-bg.webp";
import proofreadingBg from "@/assets/proofreading-bg.webp";
import interpretingBg from "@/assets/interpreting-bg.webp";
// New images - batch 6 (wedding/event services)
import weddingCoordinatorBg from "@/assets/wedding-coordinator-bg.webp";
import weddingDecorationBg from "@/assets/wedding-decoration-bg.webp";
import birthdayCakeBg from "@/assets/birthday-cake-bg.webp";
import djWeddingBg from "@/assets/dj-wedding-bg.webp";
import liveBandBg from "@/assets/live-band-bg.webp";
import weddingPhotographerBg from "@/assets/wedding-photographer-bg.webp";
import buffetSetupBg from "@/assets/buffet-setup-bg.png";
import partyDjBg from "@/assets/party-dj-bg.png";
import blueprintArchitectPlanBg from "@/assets/blueprint-architect-plan-bg.png";
import painterRollingWallBg from "@/assets/painter-rolling-wall-bg.png";
import rubbleDebrisBg from "@/assets/rubble-construction-debris-bg.png";
import taxCalculatorBg from "@/assets/tax-forms-calculator-bg.png";
import gardenerTrimmingBg from "@/assets/gardener-trimming-bushes-bg.png";
import emergencyPlumbingBg from "@/assets/leaky-pipe-emergency-bg.png";
import handymanToolboxBg from "@/assets/toolbox-handyman-bg.png";
import solarInstallationBg from "@/assets/solar-roof-installation-bg.png";
import legalGavelBg from "@/assets/legal-documents-gavel-bg.png";
import weldingSparksBg from "@/assets/welding-sparks-bg.png";
import carDetailingProBg from "@/assets/car-detailing-bg.png";
import furnitureAssemblyProBg from "@/assets/furniture-assembly-bg.png";
import underfloorHeatingBg from "@/assets/underfloor-heating-bg.png";
import gasPipesBg from "@/assets/gas-pipes-bg.png";
import seniorEscortBg from "@/assets/senior-escort-bg.png";
// New images - batch 7 (missing prominent categories)
import financialAdvisorBg from "@/assets/financial-advisor-bg.webp";
import itTechnicianBg from "@/assets/it-technician-bg.webp";
import catSittingBg from "@/assets/cat-sitting-bg.webp";
import elderlyCareBg from "@/assets/elderly-care-bg.webp";
import assistantBg from "@/assets/assistant-bg.webp";
import graphicDesignerBg from "@/assets/graphic-designer-bg.webp";
// New images - Zahrada category
import brushcutterTallGrassBg from "@/assets/brushcutter-tall-grass-bg.webp";
import lawnScarificationBg from "@/assets/lawn-scarification-bg.webp";
import fruitTreePruningBg from "@/assets/fruit-tree-pruning-bg.webp";
import arboristClimbingBg from "@/assets/arborist-climbing-bg.webp";
import gardenPergolaBg from "@/assets/garden-pergola-bg.webp";
import zahradnikBg from "@/assets/zahradnik-bg.webp";
import stavbaPlotupletivoBg from "@/assets/stavba-plotu-pletivo-bg.webp";
import pokladkaZamkoveDlazbyBg from "@/assets/pokladka-zamkove-dlazby-bg.webp";
import dlazdicStavitelZahradaBg from "@/assets/dlazdic-stavitel-zahrada-bg.webp";
import fenceInstallationBg from "@/assets/fence-installation-bg.webp";
// New images - batch 8 (regenerated services)
import heatingTechnicianBg from "@/assets/heating-technician-bg.webp";
import gasTechnicianBg from "@/assets/gas-technician-bg.webp";
import gardenerBg from "@/assets/gardener-bg.webp";
import carpenterBg from "@/assets/carpenter-bg.webp";
import kitchenCabinetBg from "@/assets/kitchen-cabinet-bg.webp";
import wardrobeBuiltInBg from "@/assets/wardrobe-bg.webp";

import { getSuperprominentBackgroundImage } from "@/config/superprominent";

const IMAGE_CACHE_BUSTER = "2026-01-16-v15";
const withImageCacheBust = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}v=${IMAGE_CACHE_BUSTER}`;

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  section?: string | null;
  section_icon?: string | null;
  display_level?: string | null;
  sort_order?: number | null;
}

interface SubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategories: Subcategory[];
  selectedSubcategoryId: string;
  onSelect: (subcategoryId: string) => void;
  categoryName: string;
}

// Prominent subcategories for "Stavebnictví"
const STAVEBNICTVI_PROMINENT = [
  "Pokládka obkladů a dlažby",
  "Stavba rodinného domu",
  "Fasáda domu",
  "Pokládka panelů"
];

// Grouping logic for "Stavebnictví" subcategories
const STAVEBNICTVI_GROUPS: Record<string, string[]> = {
  "Stavba od základů": [
    "Stavba altánu",
    "Stavba rekreační chaty / letního domu",
    "Stavba pasivního domu",
    "Stavba domu na klíč",
    "Stavba dřevostavby / rámového domu",
    "Stavba srubu / roubenky",
    "Stavba základů",
    "Stavba krbů",
    "Stavba sauny",
    "Stavba septiku / žumpy",
    "Stavba terasy",
    "Stavba přístřešku pro auto",
    "Izolace a zateplení základů",
    "Stavební nabídky",
    "Železobetonové práce",
    "Zednické práce",
    "Realizace inženýrských staveb",
    "Ostatní stavební služby"
  ],
  "Střecha a fasáda": [
    "Adaptace podkroví",
    "Stavba střechy",
    "Pokrývač",
    "Zateplení střechy",
    "Zateplení domu",
    "Zateplení podkroví",
    "Omítání fasády",
    "Vestavba podkroví",
    "Zastřešení terasy"
  ],
  "Garáže a brány": [
    "Automatizace brány",
    "Stavba garáže",
    "Betonová garáž",
    "Montáž garážových vrat",
    "Montáž posuvné brány",
    "Montáž vjezdové brány"
  ],
  "Instalace": [
    "Instalace ústředního topení",
    "Vodovodní instalace",
    "Elektroinstalace"
  ],
  "Venkovní práce": [
    "Dlaždič",
    "Stavba letního domku",
    "Kameník",
    "Kopání studny",
    "Montáž oplocení",
    "Odvodnění domu",
    "Zemní práce",
    "Pokládka zámkové dlažby",
    "Pokládka žulové dlažby"
  ],
  "Podlahy": [
    "Podlahy",
    "Pokládka parket",
    "Podlahové potěry (anhydrit, beton)"
  ],
  "Stěny a strop": [
    "Vybudování příčky",
    "Omítání stěn",
    "Montáž podhledu"
  ],
  "Dále": [
    "Geodet",
    "Stavební dozor / stavbyvedoucí",
    "Drenáž domu",
    "Dřevěné schodiště",
    "Půjčovna nářadí",
    "Pronájem strojů",
    "Pronájem kultivátoru / rotavátoru",
    "Pronájem rypadlonakladače",
    "Pronájem stavebních strojů",
    "Pronájem minirypadla",
    "Pronájem stavebního vybavení",
    "Architekt",
    "Stavba vnitřního schodiště",
    "Stavba venkovního schodiště",
    "Montáž dveří",
    "Montáž oken",
    "Montáž půdních schodů",
    "Vyrovnání terénu",
    "Převzetí bytu (kolaudace)",
    "Odvodnění pozemku",
    "Schodišťové zábradlí",
    "Stěhování",
    "Demolice a bourání budovy",
    "Pokládka dlažby na schodech",
    "Služby rypadlonakladačem"
  ]
};

// Grouping logic for "Organizace akcí" subcategories
const ORGANIZACE_AKCI_GROUPS: Record<string, string[]> = {
  "Hudba": [
    "DJ na večírek / oslavu",
    "DJ na svatbu",
    "Hudební doprovod obřadu",
    "Svatební orchestr / kapela",
    "Svatební kapela"
  ],
  "Organizace": [
    "Dětský animátor",
    "Tisk pozvánek",
    "Organizace firemních akcí",
    "Organizace společenských akcí"
  ],
  "Oděvy a kostýmy": [
    "Šití svatebních šatů",
    "Půjčovna obleků",
    "Půjčovna kostýmů / oděvů",
    "Půjčovna svatebních šatů",
    "Půjčovna šatů / společenských šatů"
  ],
  "Dorty a zákusky / Koláče": [
    "Pečení koláčů / zákusků",
    "Svatební dort",
    "Dorty na zakázku"
  ],
  "Fotografické služby": [
    "Svatební fotografie",
    "Buduárové focení / Buduárová sezení",
    "Těhotenské focení",
    "Dětské focení",
    "Focení žen",
    "Focení k prvnímu přijímání (komunii)",
    "Předsvatební / Zásnubní focení",
    "Novorozenecké focení",
    "Smyslné focení",
    "Focení"
  ],
  "Pronájem aut": [
    "Auto na svatbu",
    "Pronájem autobusů / autokarů",
    "Pronájem mikrobusů / dodávek",
    "Pronájem limuzíny",
    "Pronájem automobilů"
  ]
};

// Grouping logic for "Montáž a oprava" subcategories
const MONTAZ_A_OPRAVA_GROUPS: Record<string, string[]> = {
  "Dveře a okna": [
    "Montáž dveří",
    "Montáž posuvných dveří",
    "Montáž oken",
    "Montáž střešního okna",
    "Montáž parapetů",
    "Oprava oken",
    "Seřízení dveří",
    "Seřízení oken",
    "Těsnění oken",
    "Výměna oken"
  ],
  "Elektronika a AGD": [
    "Montáž televize na zeď",
    "Oprava tiskáren",
    "Oprava grafické karty",
    "Oprava plynového sporáku",
    "Oprava notebooků",
    "Oprava lednice",
    "Oprava pračky",
    "Oprava tabletů",
    "Oprava telefonů",
    "Oprava televizorů",
    "Oprava myčky",
    "Zapojení domácích spotřebičů (AGD)",
    "Počítačová pohotovost",
    "Servis počítačů",
    "Servis telefonů"
  ],
  "Obnovitelná energie": [
    "Montáž solárních kolektorů",
    "Montáž fotovoltaických panelů"
  ],
  "Topení / topná instalace": [
    "Plynová instalace",
    "Zapojení bojleru",
    "Zapojení kotle ÚT (ústředního topení)",
    "Servis kamen a kotlů"
  ],
  "Oděvy a doplňky": [
    "Brašnář",
    "Švadlena",
    "Oprava obuvi",
    "Krejčovské úpravy / Opravy",
    "Švec"
  ],
  "Drobné služby / Hodinový manžel": [
    "Montáž záclonových tyčí / garnýží",
    "Montáž indukční varné desky",
    "Montáž rolet",
    "Zapojení plynového sporáku",
    "Zapojení myčky",
    "Zavěšování kuchyňských skříněk"
  ],
  "Elektrikářské služby": [
    "Elektrické instalace",
    "Montáž domácího alarmu",
    "Montáž antén",
    "Montáž hromosvodu",
    "Montáž monitorovacího systému",
    "Elektrická pohotovost",
    "Ostatní elektrikářské služby"
  ],
  "Instalatérské služby": [
    "Montáž sanity (dřezy, umyvadla, vany, WC)",
    "Vodovodní instalace",
    "Montáž podomítkové baterie",
    "Montáž sprchového koutu",
    "Montáž liniového odtoku",
    "Montáž umyvadla na desku",
    "Montáž toalety",
    "Ostatní instalatérské služby"
  ],
  "Ostatní": [
    "Nouzové otevírání dveří",
    "Čištění komína",
    "Frézování komína",
    "Instalace zařízení chytré domácnosti (smart home)",
    "Kominík",
    "Montáž garážových vrat",
    "Montáž posuvné brány",
    "Montáž vjezdové brány",
    "Montáž klimatizace",
    "Montáž podlahových lišt",
    "Montáž plotového pletiva",
    "Montáž podhledu",
    "Montáž větrání / ventilace",
    "Oprava jízdních kol",
    "Madla na schodiště / Zábradlí",
    "Servis klimatizace",
    "Skládání / Montáž nábytku",
    "Svářeč",
    "Svařování plastu",
    "Výměna zámku ve dveřích",
    "Zámečník"
  ]
};

// Grouping logic for "Finanční služby" subcategories
const FINANCNI_SLUZBY_GROUPS: Record<string, string[]> = {
  "Úvěry / Půjčky": [
    "Úvěr bez registru dlužníků (BIK)",
    "Úvěr pro firmy",
    "Úvěr na auto",
    "Hotovostní půjčky",
    "Hypoteční úvěry",
    "Konsolidační úvěry"
  ],
  "Účetnictví": [
    "Daňové poradenství",
    "Daňová kancelář",
    "Účetní",
    "Vedení účetnictví",
    "Účetní poradenství"
  ],
  "Pojištění": [
    "Pojišťovací agent",
    "Havarijní pojištění (AC)",
    "Pojištění firmy",
    "Skupinové pojištění",
    "Životní pojištění",
    "Pojištění nemovitosti",
    "Pojištění automobilu"
  ],
  "Ostatní": [
    "Finanční poradce",
    "Factoring",
    "Leasing počítačů",
    "Leasing strojů",
    "Leasing nemovitostí",
    "Získávání fondů EU",
    "Odkup pohledávek",
    "Vymáhání pohledávek"
  ]
};

// Grouping logic for "Rekonstrukce / opravy" subcategories
const REKONSTRUKCE_OPRAVY_GROUPS: Record<string, string[]> = {
  "Zábradlí a madla": [
    "Skleněné zábradlí",
    "Zábradlí",
    "Nerezové zábradlí",
    "Madla na schodiště"
  ],
  "Střecha a fasáda": [
    "Adaptace / Přestavba podkroví",
    "Fasáda domu",
    "Zateplení střechy",
    "Zateplení domu",
    "Zateplení podkroví",
    "Výškové práce",
    "Rekonstrukce střechy",
    "Vestavba podkroví"
  ],
  "Instalace": [
    "Instalace ústředního topení (ÚT)",
    "Plynová instalace",
    "Chytrá domácnost (Smart Home)",
    "Instalace zařízení chytré domácnosti",
    "Ovládání vytápění",
    "Ovládání osvětlení"
  ],
  "Podlahy": [
    "Montáž podlahových lišt",
    "Pokládka panelů",
    "Pokládka podlahových panelů",
    "Pokládka vinylových panelů",
    "Pokládka parket"
  ],
  "Rekonstrukce budov": [
    "Vysoušení budov",
    "Rekonstrukce kanceláří",
    "Rekonstrukce budov",
    "Demolice a zbourání budovy",
    "Demolice stodoly"
  ],
  "Malířské služby": [
    "Natírání střech",
    "Natírání fasády",
    "Malování stropu",
    "Malování stěn",
    "Ostatní malířské služby"
  ],
  "Dokončovací práce / Dokončení interiérů": [
    "Rekonstrukce balkonu",
    "Rekonstrukce domu",
    "Rekonstrukce kuchyně",
    "Rekonstrukce podkroví",
    "Rekonstrukce koupelny",
    "Sklo na míru",
    "Pokládka dlažby na schodech",
    "Dokončení domu",
    "Dokončení bytu",
    "Dokončení na klíč",
    "Dokončení interiérů",
    "Obestavba krbu"
  ],
  "Stěny a strop": [
    "Vybudování příčky",
    "Sádrování stěn / Nanášení sádry",
    "Penetrace stěn",
    "Konstrukce ze sádrokartonu (SDK)",
    "Montáž kazetového stropu",
    "Montáž podhledu",
    "Špachtlování / Tmelení stěn",
    "Tapetování",
    "Strojní omítání",
    "Omítání stěn",
    "Odhlučnění stěn",
    "Sádrokartonové konstrukce"
  ],
  "Ostatní": [
    "Balkonové zábradlí",
    "Schodišťové zábradlí",
    "Montáž oken",
    "Výměna oken",
    "Půjčovna nářadí",
    "Ostatní stavební služby / rekonstrukce"
  ]
}

// Prominent subcategories for "Organizace akcí" (displayed first on bigger buttons)
const ORGANIZACE_AKCI_PROMINENT: string[] = [
  "Fotograf",
  "Catering",
  "Videozáznam / Natáčení videa",
  "Organizování akcí / eventů"
];

// Prominent subcategories for "Montáž a oprava" (displayed first on bigger buttons)
const MONTAZ_A_OPRAVA_PROMINENT: string[] = [
  "Oprava domácích spotřebičů (AGD)",
  "Montáž nábytku",
  "Instalatérská pohotovost",
  "Drobné opravy"
];

// Prominent subcategories for "Projektování" (displayed first on bigger buttons)
const PROJEKTOVANI_PROMINENT: string[] = [
  "Projektování / Návrhy",
  "Architekt",
  "Navrhování interiérů",
  "Vestavěné skříně",
  "Zahradní architektura / Aranžování zahrady",
  "Inženýrské projektování / Navrhování"
];

// Prominent subcategories for "Finanční služby" (displayed first on bigger buttons)
const FINANCNI_SLUZBY_PROMINENT: string[] = [
  "Pojištění odpovědnosti (povinné ručení)",
  "Leasing automobilů",
  "Úvěrový poradce",
  "Účetní kancelář"
];

// Prominent subcategories for "Instalatér" (displayed first on bigger buttons)
const INSTALATER_PROMINENT: string[] = [
  "Instalatérská pohotovost",
  "Ostatní instalatérské služby",
  "Montáž sanity (dřezy, umyvadla, vany, WC)",
  "Vodovodní instalace"
];

// Prominent subcategories for "Rekonstrukce / opravy" (displayed first on bigger buttons)
const REKONSTRUKCE_OPRAVY_PROMINENT: string[] = [
  "Pokládka obkladů a dlažby",
  "Stěhování",
  "Broušení parket (cyklování)",
  "Rekonstrukce bytu"
];

// Prominent subcategories for "Právní a administrativní" (displayed first on bigger buttons)
const PRAVNI_ADMINISTRATIVNI_PROMINENT: string[] = [
  "Právní a administrativní služby",
  "Notář",
  "Oceňovatel majetku / Majetkový znalec",
  "Stavební znalec",
  "Správa nemovitostí"
];

// Prominent subcategories for "Malířské práce" (displayed first on bigger buttons)
const MALIRSKE_PRACE_PROMINENT: string[] = [
  "Malíř",
  "Malování stěn",
  "Malování stropu",
  "Tapetování",
  "Natírání střech"
];

// Grouping logic for "Malířské práce" subcategories
const MALIRSKE_PRACE_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Penetrace stěn / Nanesení podkladu",
    "Natírání dveří",
    "Natírání fasády",
    "Natírání nábytku",
    "Natírání dlaždic a obkladů",
    "Ostatní malířské služby"
  ]
};

// Prominent subcategories for "Úklid" (displayed first on bigger buttons)
const UKLID_PROMINENT: string[] = [
  "Úklid bytů a domů",
  "Mytí oken",
  "Odvoz odpadu / smetí",
  "Odvoz suti / stavební odpadu"
];

// Grouping logic for "Úklid" subcategories
const UKLID_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Čištění koberců",
    "Deratizace",
    "Dezinsekce",
    "Mytí fasády",
    "Mytí zámkové dlažby",
    "Odstraňování plísní / Sanace proti plísním",
    "Odklízení sněhu ze střech",
    "Odklízení sněhu z cest / silnic",
    "Výškové práce",
    "Čištění čalounění nábytku",
    "Čištění čalounění automobilů",
    "Úklid kanceláří",
    "Úklid po rekonstrukci",
    "Pronájem kontejnerů",
    "Odvoz velkoobjemového odpadu"
  ]
};

// Prominent subcategories for "Online služby" (displayed first on bigger buttons)
const ONLINE_SLUZBY_PROMINENT: string[] = [
  "Navrhování interiérů",
  "Přeprava/Transport nábytku",
  "Odvoz odpadu / smetí",
  "Grafické služby"
];

// Grouping logic for "Online služby" subcategories
const ONLINE_SLUZBY_GROUPS: Record<string, string[]> = {
  "Poradenství": [
    "Úvěrový poradce",
    "Podnikatelské poradenství",
    "Daňové poradenství",
    "Účetní poradenství"
  ],
  "Úvěry / Půjčky": [
    "Úvěr bez registru dlužníků (BIK)",
    "Úvěr pro firmy",
    "Úvěr na auto",
    "Hotovostní půjčky",
    "Hypoteční úvěry",
    "Konsolidační úvěry"
  ],
  "Leasing": [
    "Leasing počítačů",
    "Leasing strojů",
    "Leasing nemovitostí",
    "Leasing automobilů"
  ],
  "Nábytek a vestavby": [
    "Kuchyňský nábytek na míru",
    "Nábytek na míru",
    "Koupelnový nábytek na míru",
    "Vestavěné skříně"
  ],
  "Montáž a oprava": [
    "Počítačová pohotovost",
    "Servis počítačů",
    "Servis telefonů"
  ],
  "Organizování akcí": [
    "Organizování eventů/akcí",
    "Organizace firemních akcí",
    "Organizace společenských akcí"
  ],
  "Projektování / Návrhy": [
    "Architekt",
    "Krajinný architekt",
    "Projekt altánu",
    "Projekt kuchyně",
    "Projekt bytu",
    "Projekt zahrady",
    "Projekt oplocení",
    "Projekt koupelny",
    "Inženýrské projektování"
  ],
  "Úklid": [
    "Dezinfekce"
  ],
  "Školení a cizí jazyky": [
    "Kurz účetnictví",
    "Výuka angličtiny",
    "Výuka francouzštiny",
    "Výuka španělštiny",
    "Výuka němčiny",
    "Výuka italštiny",
    "Překlad dokumentů",
    "Soudní překlad",
    "Překlad webových stránek",
    "Simultánní tlumočení"
  ],
  "Doprava": [
    "Kurýr",
    "Vnitrostátní doprava",
    "Přeprava nábytku",
    "Pronájem automobilů"
  ],
  "Pojištění": [
    "Havarijní pojištění (AC)",
    "Pojištění firmy",
    "Skupinové pojištění",
    "Životní pojištění",
    "Pojištění nemovitosti",
    "Pojištění odpovědnosti (povinné ručení)",
    "Pojištění automobilu"
  ],
  "Služby pro byznys": [
    "Reklamní agentura",
    "Účetní kancelář",
    "Copywriter",
    "Tisk pozvánek",
    "Reklamní složky / prospekty",
    "Trička s potiskem",
    "Potisk oděvů",
    "Vedení účetnictví",
    "Reklamní oděvy",
    "Psaní podnikatelského plánu",
    "Plakáty",
    "Návrh loga",
    "Návrh/Tvorba webových stránek",
    "Přepis textů",
    "Tvorba internetových obchodů (e-shopů)",
    "Letáky",
    "Marketingové služby",
    "Polygrafické služby"
  ],
  "Právní a administrativní služby": [
    "Advokát",
    "Stavební rozpočet",
    "Právo nemovitostí",
    "Právní poradce / Justiční rada"
  ],
  "Zdraví a krása": [
    "Dietní catering",
    "Dietolog",
    "Fyzioterapeut",
    "Výuka tance",
    "Osobní trenér",
    "Sestavování jídelníčku"
  ],
  "Ostatní": [
    "Factoring",
    "Švadlena",
    "Notář",
    "Ochrana osob a majetku",
    "Krejčovské úpravy / Opravy",
    "Projekt elektrické instalace",
    "Projektování řešení chytré domácnosti",
    "Projekty sanitárních instalací",
    "Odkup pohledávek",
    "Zasílatelství / Spedice",
    "Vymáhání pohledávek"
  ]
};

// Prominent subcategories for "Truhlářství / Nábytek"
const TRUHARSTVO_NABYTEK_PROMINENT = [
  "Nábytek a vestavby",
  "Renovace nábytku",
  "Montáž nábytku",
  "Vestavěné skříně"
];

// Grouping logic for "Truhlářství / Nábytek" subcategories
const TRUHARSTVO_NABYTEK_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Stavba krbů",
    "Zrcadla na míru",
    "Natírání nábytku",
    "Kuchyňský nábytek na míru",
    "Nábytek na míru",
    "Koupelnový nábytek na míru",
    "Polepování / Dýhování nábytku",
    "Truhlář",
    "Sklenář",
    "Sklo do kuchyně",
    "Sklo na míru",
    "Čalouník",
    "Čalounění nábytku",
    "Obestavba krbu"
  ],
  "Nábytek": [
    "Kuchyňské pracovní desky na míru",
    "Nábytková dvířka na míru",
    "Kuchyně na míru",
    "Polepování nábytku",
    "Skládání / Montáž nábytku",
    "Zavěšování kuchyňských skříněk"
  ],
  "Sklo a zrcadla": [
    "Skleněné panely do kuchyně",
    "Skleněné panely do koupelny",
    "Sklenář",
    "Sklo do kuchyně",
    "Sklo na míru",
    "Skleněné tabule na míru",
    "Sklenářství"
  ],
  "Čalounictví": [
    "Čalouník",
    "Čalounění židle",
    "Čalounění nábytku",
    "Čalounění postele"
  ],
  "Ostatní": [
    "Stavba krbů",
    "Truhlářská dílna",
    "Truhlář",
    "Obestavba krbu"
  ]
};

// Prominent subcategories for "Výuka a jazyky"
const VYUKA_JAZYKY_PROMINENT = [
  "Školení a cizí jazyky",
  "Výuka angličtiny",
  "Školení BOZP (Bezpečnost a ochrana zdraví při práci)",
  "Překlad dokumentů",
  "Kurz účetnictví"
];

// Grouping logic for "Výuka a jazyky" subcategories
const VYUKA_JAZYKY_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Autoškola / Výuka jízdy",
    "Výuka francouzštiny",
    "Výuka španělštiny",
    "Výuka němčiny",
    "Výuka italštiny",
    "Školení požární ochrany (PO)",
    "Školení první pomoci",
    "Jazyková škola",
    "Soudní překlad",
    "Překlad webových stránek",
    "Simultánní tlumočení"
  ]
};

// Prominent subcategories for "Zdraví a krása"
const ZDRAVI_KRASA_PROMINENT = [
  "Kadeřník",
  "Hybridní manikúra",
  "Osobní trenér",
  "Relaxační masáž"
];

// Grouping logic for "Zdraví a krása" subcategories
const ZDRAVI_KRASA_GROUPS: Record<string, string[]> = {
  "Dieta": [
    "Dietní catering",
    "Dietolog",
    "Sestavování jídelníčku"
  ],
  "Líčení / Make-up": [
    "Příležitostné líčení",
    "Permanentní make-up",
    "Večerní líčení"
  ],
  "Nehty": [
    "Gelové nehty",
    "Pedikúra"
  ],
  "Kadeřnické služby": [
    "Barvení vlasů",
    "Stříhání vlasů"
  ],
  "Kosmetické služby": [
    "Depilace",
    "Henna na obočí",
    "Henna na řasy",
    "Mikrodermabraze",
    "Prodlužování řas",
    "Úprava / Regulace obočí"
  ],
  "Zdraví a relaxace": [
    "Akupunktura",
    "Chiropraxe",
    "Fyzioterapeut",
    "Jóga",
    "Výuka tance"
  ]
};

// Prominent subcategories for "Autoservis"
const AUTOSERVIS_PROMINENT = [
  "Autoelektrikář",
  "Automechanik",
  "Výkup aut",
  "Výměna pneumatik"
];

// Grouping logic for "Autoservis" subcategories
const AUTOSERVIS_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Autovrakoviště / Likvidace vozidel",
    "Autoklempíř",
    "Chiptuning",
    "Geometrie kol",
    "Instalace LPG",
    "Konzervace podvozku",
    "Autolakýrník",
    "Motomechanik (Mechanik motocyklů)",
    "Montáž parkovacích senzorů",
    "Montáž tažného zařízení",
    "Montáž parkovací kamery",
    "Mytí motoru",
    "Oprava alternátorů",
    "Oprava chladičů",
    "Oprava hliníkových disků/kol",
    "Oprava světlometů",
    "Oprava tachometrů / budíků",
    "Oprava čalounění stropu",
    "Oprava elektromotorů",
    "Oprava převodovky",
    "Oprava automatických převodovek",
    "Oprava autoskel",
    "Oprava tlumičů výfuku",
    "Autoškola / Výuka jízdy",
    "Pískování disků/kol",
    "Tónování skel",
    "Repase vstřikovacích čerpadel",
    "Repase světlometů",
    "Repase turbodmychadel",
    "Repase brzdových třmenů",
    "Servis LPG zařízení",
    "Servis autoklimatizací",
    "Autoservis",
    "Svářeč",
    "Autozámečník / Čalouník autosedaček",
    "Tuning aut",
    "Autoservis / Autodílna",
    "Vulkánizace pneumatik",
    "Výměna brzdových destiček",
    "Výměna oleje",
    "Výměna spojky"
  ]
};

// Prominent subcategories for "Transport"
const TRANSPORT_PROMINENT = [
  "Stěhování",
  "Přeprava osob",
  "Vnitrostátní doprava",
  "Kurýr"
];

// Grouping logic for "Transport" subcategories
const TRANSPORT_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Pronájem automobilů",
    "Auto na svatbu",
    "Spedice / Zasílatelství",
    "Přeprava dřeva",
    "Přeprava nábytku",
    "Vnitrostátní přeprava aut",
    "Zahraniční přeprava aut",
    "Zahraniční přeprava",
    "Přepravní služby",
    "Pronájem autobusů / autokarů",
    "Pronájem mikrobusů / dodávek",
    "Pronájem limuzíny",
    "Pronájem dodávkového vozu",
    "Správa vozového parku"
  ]
};

// Prominent subcategories for "Hodinový manžel"
const HODINOVY_MANZEL_PROMINENT = [
  "Oprava domácích spotřebičů (AGD)",
  "Drobné opravy",
  "Montáž sanity (dřezy, umyvadla, vany, WC)",
  "Zapojení domácích spotřebičů (AGD)"
];

// Grouping logic for "Hodinový manžel" subcategories
const HODINOVY_MANZEL_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Seřízení dveří",
    "Seřízení oken",
    "Montáž záclonových tyčí / garnýží",
    "Montáž indukční varné desky",
    "Montáž rolet",
    "Montáž televize na zeď",
    "Montáž lustru",
    "Oprava oken",
    "Odklízení sněhu ze střech",
    "Odklízení sněhu z cest / silnic",
    "Zapojení zásuvky",
    "Vrtání otvorů",
    "Věšení obrazů"
  ]
};

// Prominent subcategories for "Zahradnictví"
const ZAHRADNICTVI_PROMINENT = [
  "Návrh/Úprava zahrady",
  "Pokládka zámkové dlažby",
  "Kácení stromů",
  "Založení trávníku"
];

// Grouping logic for "Zahradnictví" subcategories
const ZAHRADNICTVI_GROUPS: Record<string, string[]> = {
  "Dlaždičské a kamenické práce": [
    "Dlaždič",
    "Kameník",
    "Pokládka žulové kostky",
    "Montáž vjezdové brány",
    "Prořezávání stromů",
    "Pronájem kultivátoru / rotavátoru"
  ],
  "Péče o zahradu": [
    "Aerace trávníku",
    "Sekání trávy",
    "Zavlažování zahrady a trávníku",
    "Hnojení trávníku",
    "Zahradník",
    "Postřiky ovocných stromů",
    "Přesazování stromů",
    "Sázení stromů",
    "Vertikutace trávníku",
    "Ostatní zahradnické služby"
  ],
  "Terasy a altány": [
    "Stavba altánu",
    "Stavba terasy",
    "Zastřešení terasy"
  ],
  "Ostatní": [
    "Krajinný architekt",
    "Stavba zahradního jezírka",
    "Montáž oplocení",
    "Montáž plotového pletiva",
    "Zahradní osvětlení",
    "Projekt oplocení",
    "Projekt celoročního záhonu",
    "Zakládání zahrad"
  ]
};

// Prominent subcategories for "Obchodní služby"
const OBCHODNI_SLUZBY_PROMINENT = [
  "Účetní kancelář",
  "Polygrafické služby",
  "Pojištění firmy",
  "Dávkovače/Distributory vody"
];

// Grouping logic for "Obchodní služby" subcategories
const OBCHODNI_SLUZBY_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Velkoformátový tisk"
  ],
  "Marketing a reklama": [
    "Marketingová agentura",
    "PR agentura (Public Relations)",
    "Reklamní agentura",
    "Copywriter",
    "Reklamní oděvy",
    "Grafický design",
    "Návrh loga",
    "Návrh/Tvorba webových stránek",
    "Tvorba internetových obchodů (e-shopů)",
    "Grafické služby",
    "Marketingové služby"
  ],
  "Kancelářská technika": [
    "Oprava tiskáren",
    "Počítačová pohotovost",
    "Servis počítačů",
    "Servis telefonů",
    "Pronájem kávovaru"
  ],
  "Polygrafické služby": [
    "Reklamní složky / prospekty",
    "Trička s potiskem",
    "Potisk oděvů",
    "Plakáty",
    "Návrh letáků",
    "Návrh vizitek",
    "Letáky"
  ],
  "Ostatní": [
    "Podnikatelské poradenství",
    "Poskytovatelé internetu",
    "Fotograf",
    "Fotografování nemovitostí",
    "Advokátní kancelář",
    "Pracovní lékařství",
    "Ochrana osob a majetku",
    "Psaní podnikatelského plánu",
    "Právní poradenství",
    "Přepis textů",
    "Focení / Fotografické sezení",
    "Jazyková škola",
    "Šicí dílna / Švadlena (pro firmy)",
    "Konzultační služby"
  ]
};

// Prominent subcategories for "Elektrikář"
const ELEKTRIKAR_PROMINENT = [
  "Elektroinstalace",
  "Elektrikářská pohotovost",
  "Ostatní elektrikářské služby",
  "Zapojení domácích spotřebičů (AGD)"
];

// Grouping logic for "Elektrikář" subcategories
const ELEKTRIKAR_GROUPS: Record<string, string[]> = {
  "Dále": [
    "Elektrické měření / Revize",
    "Energetický audit",
    "Instalace zařízení chytré domácnosti",
    "Montáž domovního telefonu",
    "Montáž hromosvodu",
    "Montáž přepěťové ochrany",
    "Převzetí / Kontrola elektroinstalace",
    "Zahradní osvětlení",
    "Zapojení zásuvky",
    "Projektování řešení chytré domácnosti",
    "Revize elektroinstalace",
    "Ovládání vytápění",
    "Ovládání osvětlení",
    "Výměna elektroinstalace"
  ]
};

// Map category names to their groups
const CATEGORY_GROUPS: Record<string, Record<string, string[]>> = {
  "Stavebnictví": STAVEBNICTVI_GROUPS,
  "Organizace akcí": ORGANIZACE_AKCI_GROUPS,
  "Montáž a oprava": MONTAZ_A_OPRAVA_GROUPS,
  "Finanční služby": FINANCNI_SLUZBY_GROUPS,
  "Rekonstrukce / opravy": REKONSTRUKCE_OPRAVY_GROUPS,
  "Malířské práce": MALIRSKE_PRACE_GROUPS,
  "Úklid": UKLID_GROUPS,
  "Online služby": ONLINE_SLUZBY_GROUPS,
  "Truhlářství / Nábytek": TRUHARSTVO_NABYTEK_GROUPS,
  "Výuka a jazyky": VYUKA_JAZYKY_GROUPS,
  "Zdraví a krása": ZDRAVI_KRASA_GROUPS,
  "Autoservis": AUTOSERVIS_GROUPS,
  "Transport": TRANSPORT_GROUPS,
  "Hodinový manžel": HODINOVY_MANZEL_GROUPS,
  "Zahradnictví": ZAHRADNICTVI_GROUPS,
  "Obchodní služby": OBCHODNI_SLUZBY_GROUPS,
  "Elektrikář": ELEKTRIKAR_GROUPS
};

// Map category names to their prominent subcategories
const CATEGORY_PROMINENT: Record<string, string[]> = {
  "Stavebnictví": STAVEBNICTVI_PROMINENT,
  "Organizace akcí": ORGANIZACE_AKCI_PROMINENT,
  "Montáž a oprava": MONTAZ_A_OPRAVA_PROMINENT,
  "Projektování": PROJEKTOVANI_PROMINENT,
  "Finanční služby": FINANCNI_SLUZBY_PROMINENT,
  "Instalatér": INSTALATER_PROMINENT,
  "Rekonstrukce / opravy": REKONSTRUKCE_OPRAVY_PROMINENT,
  "Právní a administrativní": PRAVNI_ADMINISTRATIVNI_PROMINENT,
  "Malířské práce": MALIRSKE_PRACE_PROMINENT,
  "Úklid": UKLID_PROMINENT,
  "Online služby": ONLINE_SLUZBY_PROMINENT,
  "Truhlářství / Nábytek": TRUHARSTVO_NABYTEK_PROMINENT,
  "Výuka a jazyky": VYUKA_JAZYKY_PROMINENT,
  "Zdraví a krása": ZDRAVI_KRASA_PROMINENT,
  "Autoservis": AUTOSERVIS_PROMINENT,
  "Transport": TRANSPORT_PROMINENT,
  "Hodinový manžel": HODINOVY_MANZEL_PROMINENT,
  "Zahradnictví": ZAHRADNICTVI_PROMINENT,
  "Obchodní služby": OBCHODNI_SLUZBY_PROMINENT,
  "Elektrikář": ELEKTRIKAR_PROMINENT
};

const getGroupedSubcategories = (subcategories: Subcategory[], categoryName: string) => {
  const grouped: Record<string, Subcategory[]> = {};
  const prominent: Subcategory[] = [];
  const ungrouped: Subcategory[] = [];

  // Check if subcategories have the new section/display_level fields (Autoservis style)
  const hasNewStructure = subcategories.some(sub => sub.section && sub.display_level);
  
  if (hasNewStructure) {
    // New structure: group by section, separate by display_level
    const sections: Record<string, { prominent: Subcategory[]; standard: Subcategory[]; hidden: Subcategory[]; icon?: string | null }> = {};
    
    subcategories.forEach(sub => {
      const section = sub.section || 'Ostatní';
      if (!sections[section]) {
        sections[section] = { prominent: [], standard: [], hidden: [], icon: sub.section_icon };
      }
      
      // SUPERPROMINENT acts as PROMINENT in category dialogs
      if (sub.display_level === 'PROMINENT' || sub.display_level === 'SUPERPROMINENT') {
        sections[section].prominent.push(sub);
      } else if (sub.display_level === 'HIDDEN') {
        sections[section].hidden.push(sub);
      } else {
        sections[section].standard.push(sub);
      }
    });
    
    // Sort each section's items by sort_order
    Object.values(sections).forEach(section => {
      section.prominent.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      section.standard.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      section.hidden.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
    
    // Define section order for specific categories
    const SECTION_ORDER: Record<string, string[]> = {
      "Elektro": ["Elektroinstalace", "Internet a Zabezpečení", "Fotovoltaika"],
      "Autoservis": ["Autoservis", "Pneuservis", "Autoelektrika", "Karoserie a Skla", "Ostatní auto služby", "Motocykly"],
      "Instalatér": ["Vodoinstalace", "Topení", "Plyn"],
      "Stavby/Rekonstrukce": ["Zednické práce", "Sádrokartony", "Obklady a Dlažby", "Podlahy", "Malíři a Tapetáři", "Fasády", "Okna a Dveře", "Střecha", "Stavba"],
      "Zámečník": ["Kovovýroba", "Zámečník"],
      "Truhlářství / Nábytek": ["Nábytek na míru", "Montáž nábytku", "Opravy a Renovace"],
      "Hodinový manžel": ["Montáže", "Drobné opravy"],
      "Zahrada": ["Údržba zeleně", "Stavby a Úpravy"],
      "Úklid": ["Domácnost", "Koberce a Sedačky", "Exteriér", "Speciální"],
      "PC a Mobily": ["Počítače", "Mobily a Tablety", "Elektronika"],
      "Mazlíčci": ["Služby"],
      "Hlídání a péče": ["Děti", "Senioři"],
      "Finance": ["Účetnictví", "Poradenství"],
      "Právní služby": ["Právní služby"],
      "Pro firmy": ["Marketing", "Administrativa", "Tisk"],
      "Výuka a jazyky": ["Jazyky", "Doučování", "Umění a Hobby", "Odborné", "Překlady"],
      "Zdraví a krása": ["Vlasy", "Kosmetika", "Nehty", "Tělo", "Pohyb a Výživa"],
      "Akce a svatby": ["Svatba", "Oslavy", "Hudba", "Foto a Video"],
      "Transport": ["Stěhování", "Doprava", "Pronájem"],
      "Projektování": ["Stavby", "Interiér a Zahrada"],
      "Ostatní": ["Různé"]
    };
    
    const orderedSections = SECTION_ORDER[categoryName];
    if (orderedSections) {
      const sortedSections: typeof sections = {};
      orderedSections.forEach(sectionName => {
        if (sections[sectionName]) {
          sortedSections[sectionName] = sections[sectionName];
        }
      });
      // Add any remaining sections not in the order
      Object.keys(sections).forEach(sectionName => {
        if (!sortedSections[sectionName]) {
          sortedSections[sectionName] = sections[sectionName];
        }
      });
      return { grouped: {}, prominent: [], ungrouped: [], sections: sortedSections };
    }
    
    return { grouped: {}, prominent: [], ungrouped: [], sections };
  }

  // Legacy structure: use predefined groups
  const categoryGroups = CATEGORY_GROUPS[categoryName];
  const prominentNames = CATEGORY_PROMINENT[categoryName] || [];

  // If no groups and no prominent names, return all as ungrouped
  if (!categoryGroups && prominentNames.length === 0) {
    return { grouped: {}, prominent: [], ungrouped: subcategories };
  }

  // Create a map of subcategory name to group
  const nameToGroup: Record<string, string> = {};
  if (categoryGroups) {
    Object.entries(categoryGroups).forEach(([groupName, names]) => {
      names.forEach(name => {
        nameToGroup[name] = groupName;
      });
    });
  }

  // Group subcategories
  subcategories.forEach(sub => {
    if (prominentNames.includes(sub.name)) {
      prominent.push(sub);
    } else {
      const group = nameToGroup[sub.name];
      if (group) {
        if (!grouped[group]) {
          grouped[group] = [];
        }
        grouped[group].push(sub);
      } else {
        ungrouped.push(sub);
      }
    }
  });

  return { grouped, prominent, ungrouped };
};

const getSectionIcon = (iconName: string | null | undefined) => {
  switch (iconName) {
    case 'Wrench': return Wrench;
    case 'Circle': return Circle;
    case 'Zap': return Zap;
    case 'Car': return Car;
    case 'Settings': return Settings;
    case 'Bike': return Bike;
    case 'Wifi': return Wifi;
    case 'Sun': return Sun;
    case 'Hammer': return Hammer;
    case 'Square': return Square;
    case 'Grid3X3': return Grid3X3;
    case 'Layers': return Layers;
    case 'Paintbrush': return Paintbrush;
    case 'Building': return Building;
    case 'DoorOpen': return DoorOpen;
    case 'Home': return Home;
    case 'HardHat': return HardHat;
    case 'Key': return KeyRound;
    case 'Sofa': return Sofa;
    case 'TreeDeciduous': return TreeDeciduous;
    case 'Building2': return Building2;
    case 'Leaf': return Leaf;
    case 'Monitor': return Monitor;
    case 'Smartphone': return Smartphone;
    case 'Tv': return Tv;
    case 'Dog': return Dog;
    case 'Baby': return Baby;
    case 'HeartHandshake': return HeartHandshake;
    case 'Calculator': return Calculator;
    case 'Handshake': return Handshake;
    case 'Scale': return Scale;
    case 'Megaphone': return Megaphone;
    case 'ClipboardList': return ClipboardList;
    case 'Printer': return Printer;
    case 'Languages': return Languages;
    case 'GraduationCap': return GraduationCap;
    case 'Palette': return Palette;
    case 'Award': return Award;
    case 'FileText': return FileText;
    case 'Scissors': return Scissors;
    case 'Sparkles': return Sparkles;
    case 'Hand': return Hand;
    case 'Heart': return Heart;
    case 'Dumbbell': return Dumbbell;
    case 'Cake': return Cake;
    case 'Music': return Music;
    case 'Camera': return Camera;
    case 'Truck': return Truck;
    case 'Fence': return Fence;
    case 'Trash2': return Trash2;
    case 'Cpu': return Cpu;
    case 'Network': return Network;
    case 'Brain': return Brain;
    case 'Newspaper': return Newspaper;
    case 'PhoneCall': return PhoneCall;
    case 'Users': return Users;
    case 'Watch': return Watch;
    case 'Gem': return Gem;
    case 'Apple': return Apple;
    case 'ArrowUpCircle': return ArrowUpCircle;
    case 'Navigation': return Navigation;
    case 'Code': return Code;
    case 'Plane': return Plane;
    default: return Wrench;
  }
};

const SubcategoryDialog = ({
  open,
  onOpenChange,
  subcategories,
  selectedSubcategoryId,
  onSelect,
  categoryName
}: SubcategoryDialogProps) => {
  const result = getGroupedSubcategories(subcategories, categoryName);
  const { grouped, prominent, ungrouped } = result;
  const sections = 'sections' in result ? result.sections as Record<string, { prominent: Subcategory[]; standard: Subcategory[]; hidden: Subcategory[] }> : null;
  const hasGroups = Object.keys(grouped).length > 0;
  const hasProminent = prominent.length > 0;
  const hasSections = sections && Object.keys(sections).length > 0;
  
  // State for expanded hidden sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Map subcategory names to background images
  const getBackgroundImage = (name: string) => {
    const superprominentBg = getSuperprominentBackgroundImage(name);
    if (superprominentBg) return superprominentBg;

    const lowerName = name.toLowerCase();

    // Debug (temporary): verify which image URL is selected for Instalatér prominents
    if (
      lowerName.includes("instalatér") ||
      (lowerName.includes("diagnostika závady") && lowerName.includes("vod")) ||
      (lowerName.includes("revize") && lowerName.includes("plyn"))
    ) {
      // eslint-disable-next-line no-console
      console.log("[SubcategoryDialog] bg match input:", name);
    }

    // =========== STAVBY/REKONSTRUKCE - MUST COME FIRST TO AVOID GENERIC CATCHES ===========
    // Stavby/Rekonstrukce - Zednické práce section (UNIQUE IMAGES)
    if (lowerName.includes("zedník") && lowerName.includes("obecná")) return masonBg;
    if (lowerName.includes("vyzdívání příček")) return masonPartitionBg;
    if (lowerName.includes("jádrová omítka")) return plasterCoatBg;
    // Stavby/Rekonstrukce - Sádrokartony section (UNIQUE IMAGES)
    if (lowerName.includes("sádrokartonář") && lowerName.includes("obecná")) return drywallBg;
    if (lowerName.includes("sdk podhledy")) return drywallCeilingBg;
    if (lowerName.includes("sdk příčky")) return drywallPartitionBg;
    // Stavby/Rekonstrukce - Obklady a Dlažby section (UNIQUE IMAGES)
    if (lowerName.includes("obkladač") && lowerName.includes("obecná")) return tilerBg;
    if (lowerName.includes("pokládka obkladů")) return wallTilesBathroomBg;
    if (lowerName.includes("pokládka dlažby")) return floorTilesBg;
    // =========== STAVBY/REKONSTRUKCE - CATEGORY LEVEL PROMINENTS ===========
    // These are general category workers (not specific tasks)
    if (lowerName === "zedník") return masonBricklayerBg;
    if (lowerName === "dělník (výkopy, betonování)") return constructionLaborerBg;
    if (lowerName === "podlahář") return flooringInstallerBg;
    if (lowerName === "pokrývač / klempíř") return rooferTilerBg;
    if (lowerName === "montážník oken/dveří") return windowDoorInstallerBg;
    if (lowerName === "fasádník (zateplení a fasády)") return facadeWorkerBg;
    if (lowerName === "sádrokartonář") return drywallInstallerBg;
    if (lowerName === "instalatér") return plumberServiceBg;
    // =========== ZDRAVÍ A KRÁSA - CATEGORY LEVEL PROMINENTS ===========
    if (lowerName === "pánský střih") return mensHaircutBg;
    if (lowerName === "dámský střih") return womensHaircutBg;
    if (lowerName === "kosmetička") return beauticianBg;
    if (lowerName === "čištění pleti") return facialCleansingBg;
    if (lowerName === "úprava obočí / barvení řas") return eyebrowLashBg;
    // =========== END CATEGORY LEVEL PROMINENTS ===========
    // Stavby/Rekonstrukce - Podlahy section (UNIQUE IMAGES)
    if (lowerName.includes("plovoucí podlahy") || lowerName.includes("laminát")) return lamFloorBg;
    if (lowerName.includes("vinylové podlahy") || lowerName.includes("vinyl")) return vinylFloorBg;
    // Stavby/Rekonstrukce - Malíři a Tapetáři section (UNIQUE IMAGES)
    if (lowerName.includes("malíř") && lowerName.includes("obecná")) return painterRoomBg;
    if (lowerName.includes("malování pokojů") && lowerName.includes("bílá")) return roomPaintingWhiteBg;
    if (lowerName.includes("malování pokojů") && lowerName.includes("barevná")) return roomPaintingColorBg;
    if (lowerName.includes("malování pokojů")) return roomPaintingWhiteBg;
    // Stavby/Rekonstrukce - Fasády section (UNIQUE IMAGES)
    if (lowerName.includes("fasádník") && lowerName.includes("obecná")) return facadeInsulationBg;
    if (lowerName.includes("zateplení fasády")) return facadeThermalBg;
    if (lowerName.includes("montáž lešení")) return scaffoldingBg;
    // Stavby/Rekonstrukce - Okna a Dveře section (UNIQUE IMAGES)
    if (lowerName.includes("montážník oken") && lowerName.includes("obecná")) return windowMountingBg;
    if (lowerName.includes("seřízení kování oken")) return windowAdjustmentBg;
    if (lowerName.includes("montáž interiérových dveří")) return doorInstallationBg;
    // Stavby/Rekonstrukce - Střecha section (UNIQUE IMAGES)
    if (lowerName.includes("pokrývač") && lowerName.includes("obecná")) return rooferBg;
    if (lowerName.includes("oprava zatékání střechy")) return roofRepairBg;
    if (lowerName.includes("pokládka střešní krytiny")) return roofTilesBg;
    // Stavby/Rekonstrukce - Stavba section (UNIQUE IMAGES)
    if (lowerName.includes("dělník") && lowerName.includes("obecná")) return excavationBg;
    if (lowerName.includes("výkopové práce") && lowerName.includes("minibagr")) return excavatorTrenchBg;
    if (lowerName.includes("výkopové práce") && lowerName.includes("ruční")) return manualExcavationBg;
    if (lowerName.includes("výkopové práce")) return excavationBg;
    // =========== END STAVBY/REKONSTRUKCE ===========

    // =========== ZÁMEČNÍK - KOVOVÝROBA section ===========
    if (lowerName.includes("kovovýroba") && lowerName.includes("obecná")) return weldingRepairBg;
    if (lowerName.includes("vjezdové brány")) return metalFenceGateBg;
    if (lowerName.includes("branky") && lowerName.includes("montáž")) return metalGateInstallationBg;
    if (lowerName.includes("svářečské práce") || lowerName.includes("svařování")) return weldingSparksBg;
    if (lowerName.includes("pohonu brány")) return metalFenceGateBg;
    if (lowerName.includes("zábradlí") && lowerName.includes("kov")) return railingInstallationBg;
    if (lowerName.includes("ocelového schodiště")) return metalStaircaseBg;
    // =========== ZÁMEČNÍK - ZÁMEČNÍK section ===========
    if (lowerName.includes("zámečník") && lowerName.includes("obecná")) return locksmithGeneralBg;
    if (lowerName.includes("zámkové vložky")) return lockReplacementBg;
    if (lowerName.includes("nouzové otevírání")) return emergencyLocksmithBg;
    if (lowerName.includes("zadlabacího zámku")) return lockReplacementBg;
    if (lowerName.includes("zasekávajícího zámku")) return lockReplacementBg;
    if (lowerName.includes("bezpečnostního kování")) return securityHardwareBg;
    // =========== END ZÁMEČNÍK ===========

    // Autoservis section
    if (lowerName.includes("automech") && lowerName.includes("obecná")) return autoMechanicBg;
    if (lowerName.includes("diagnostika závady") && (lowerName.includes("auto") || lowerName.includes("voz") || lowerName.includes("motor"))) return carDiagnosticBg;
    if (lowerName.includes("pravidelná roční prohlídka")) return carAnnualServiceBg;
    // Pneuservis section
    if (lowerName.includes("pneuservis") && lowerName.includes("obecná")) return pneuservisBg;
    if (lowerName.includes("kompletní přezutí pneu")) return tireChangeBg;
    if (lowerName.includes("vyvážení kol")) return wheelBalancingBg;
    // Autoelektrika section  
    if (lowerName.includes("autoelektrikář")) return autoElectricianBg;
    if (lowerName.includes("diagnostika elektro")) return carDiagnosticBg;
    if (lowerName.includes("výměna autobaterie")) return carBatteryBg;
    // Karoserie a Skla section
    if (lowerName.includes("autoklempíř")) return autoBodyBg;
    if (lowerName.includes("výměna čelního skla")) return windshieldBg;
    if (lowerName.includes("lakování")) return carPaintingBg;
    // Ostatní auto služby section
    if (lowerName.includes("plnění klimatizace")) return carAcServiceBg;
    if (lowerName.includes("tepování interiéru")) return carDetailingBg;
    if (lowerName.includes("detailing vozu")) return carDetailingProBg;
    // Motocykly section
    if (lowerName.includes("motomechanik")) return motorcycleMechanicBg;
    if (lowerName.includes("servisní prohlídka motocyklu")) return motorcycleServiceBg;
    if (lowerName.includes("výměna pneumatik na motorce")) return motorcycleTireBg;
    // Generic auto fallbacks
    if (lowerName.includes("pneumatik") || lowerName.includes("pneu") || lowerName.includes("vulkan")) return tireChangeBg;
    if (lowerName.includes("výkup") && lowerName.includes("aut")) return carBuyingBg;
    if (lowerName.includes("autoelektrik")) return autoElectricianBg;
    if (lowerName.includes("automech") || (lowerName.includes("diagnostika") && (lowerName.includes("auto") || lowerName.includes("voz") || lowerName.includes("motor")))) return autoMechanicBg;
    if (lowerName.includes("autoklemp") || lowerName.includes("karoserie")) return autoBodyBg;
    if (lowerName.includes("autolakýrník") || lowerName.includes("lakýrník")) return autoPainterBg;
    if (lowerName.includes("odtah") || lowerName.includes("tow")) return towServiceBg;
    if (lowerName.includes("motomech") || lowerName.includes("motocykl")) return motorcycleMechanicBg;
    if (lowerName.includes("klimatizac") || lowerName.includes("plnění klim")) return carAcServiceBg;
    if (lowerName.includes("stavba") && lowerName.includes("domu")) return houseConstructionBg;
    if (lowerName.includes("stavba") && lowerName.includes("rodin")) return houseConstructionBg;
    if (lowerName.includes("fasáda")) return facadeInstallationBg;
    if (lowerName.includes("obklad") || lowerName.includes("dlažb")) return tileLayingBg;
    if (lowerName.includes("pokládka") && lowerName.includes("panel")) return tileLayingBg;
    // Organizace akcí
    if (lowerName.includes("fotograf") || lowerName.includes("focení")) return photographerBg;
    if (lowerName.includes("rautu") || (lowerName.includes("catering") && lowerName.includes("příprava"))) return buffetSetupBg;
    if (lowerName.includes("catering")) return cateringBg;
    if (lowerName.includes("video") || lowerName.includes("natáčení")) return videographerBg;
    if (lowerName.includes("organizov") || lowerName.includes("event")) return eventPlanningBg;
    // Montáž a oprava
    if (lowerName.includes("spotřebič") || lowerName.includes("agd")) return applianceRepairBg;
    if (lowerName.includes("montáž") && lowerName.includes("nábytk")) return furnitureAssemblyBg;
    if (lowerName.includes("skládání") && lowerName.includes("nábytk")) return furnitureAssemblyProBg;
    if (lowerName.includes("drobné opravy")) return handymanToolboxBg;
    if (lowerName.includes("hodinový manžel")) return handymanBg;
    
    // Projektování
    if (lowerName.includes("architekt") && !lowerName.includes("krajin") && !lowerName.includes("zahrad")) return architectBg;
    if (lowerName.includes("interiér") || lowerName.includes("navrhování interiér")) return interiorDesignBg;
    if (lowerName.includes("vestavěn") && lowerName.includes("skříň")) return wardrobeBg;
    if (lowerName.includes("projektování") || lowerName.includes("návrh")) return blueprintArchitectPlanBg;
    if (lowerName.includes("inženýrsk")) return blueprintArchitectPlanBg;
    if (lowerName.includes("zahradní architektur") || lowerName.includes("aranžování zahrad")) return gardenDesignBg;
    // Zdraví a krása
    if (lowerName.includes("kadeřn") || lowerName.includes("stříhání vlasů")) return hairdresserBg;
    if (lowerName.includes("manikúra") || lowerName.includes("nehty")) return manicureBg;
    if (lowerName.includes("osobní trenér") || lowerName.includes("fitness")) return personalTrainerBg;
    if (lowerName.includes("masáž") || lowerName.includes("relaxační")) return massageBg;
    // Instalatér (fallback)
    // Important: keep these broad matches from catching PROMINENT Instalatér subcategories
    // which are handled later with dedicated images.
    if (
      (lowerName.includes("instalatér") || lowerName.includes("vodovodn")) &&
      !lowerName.includes("obecná") &&
      !lowerName.includes("pohotovost") &&
      !lowerName.includes("diagnostika") &&
      !lowerName.includes("revize")
    ) {
      return plumbingBg;
    }
    if (lowerName.includes("montáž sanity") || lowerName.includes("umyvadl") || lowerName.includes("wc")) return sanitaryInstallationBg;
    if (lowerName.includes("ostatní instalatérské")) return plumbingBg;
    // Rekonstrukce / opravy
    if (lowerName.includes("rekonstrukce") && lowerName.includes("koupeln")) return bathroomBg;
    if (lowerName.includes("rekonstrukce") && lowerName.includes("byt")) return interiorRenovationBg;
    if (lowerName.includes("broušení") && lowerName.includes("parket")) return parquetSandingBg;
    if (lowerName.includes("stěhování")) return movingBg;
    // Malířské práce
    if (lowerName.includes("malování stěn") || lowerName.includes("malování stropu")) return painterRollingWallBg;
    if (lowerName.includes("malíř") || lowerName.includes("malování")) return wallPaintingBg;
    if (lowerName.includes("tapetování")) return wallPaintingBg;
    if (lowerName.includes("natírání") && lowerName.includes("střech")) return roofingBg;
    if (lowerName.includes("natírání")) return wallPaintingBg;
    // Úklid
    if (lowerName.includes("úklid") && (lowerName.includes("byt") || lowerName.includes("dom"))) return cleaningBg;
    if (lowerName.includes("mytí") && lowerName.includes("oken")) return windowCleaningBg;
    if (lowerName.includes("odvoz suti") || lowerName.includes("stavební odpad")) return rubbleDebrisBg;
    if (lowerName.includes("odvoz") && (lowerName.includes("odpad") || lowerName.includes("suti"))) return wasteDisposalBg;
    // Zahradnictví / Zahrada
    if (lowerName === "zahradník") return gardenerBg;
    if (lowerName.includes("zahradník") && lowerName.includes("obecná")) return gardenerBg;
    if (lowerName.includes("zahradník") && lowerName.includes("údržba")) return gardenerTrimmingBg;
    if (lowerName.includes("návrh") && lowerName.includes("zahrad")) return gardenDesignBg;
    if (lowerName.includes("úprava") && lowerName.includes("zahrad")) return gardenDesignBg;
    if (lowerName.includes("zahradní architektur")) return gardenDesignBg;
    if (lowerName.includes("sekání") && lowerName.includes("sekač")) return lawnMowingBg;
    if (lowerName.includes("sekání") && lowerName.includes("křovinořez")) return brushcutterTallGrassBg;
    if (lowerName.includes("sekání trávy")) return lawnMowingBg;
    if (lowerName.includes("vertikutace")) return lawnScarificationBg;
    if (lowerName.includes("hnojení") && lowerName.includes("trávník")) return lawnInstallationBg;
    if (lowerName.includes("stříhání") && lowerName.includes("plot")) return hedgeTrimmingBg;
    if (lowerName.includes("řez") && lowerName.includes("ovocn")) return fruitTreePruningBg;
    if (lowerName.includes("kácení") && lowerName.includes("strom") && lowerName.includes("ze země")) return treeCuttingBg;
    if (lowerName.includes("rizikové kácení")) return arboristClimbingBg;
    if (lowerName.includes("kácení") && lowerName.includes("strom")) return treeCuttingBg;
    if (lowerName.includes("odstranění pařez")) return treeCuttingBg;
    if (lowerName.includes("hrabání listí")) return lawnMowingBg;
    if (lowerName.includes("odvoz bioodpad")) return wasteDisposalBg;
    if (lowerName.includes("dlaždič") && lowerName.includes("zahrad")) return dlazdicStavitelZahradaBg;
    if (lowerName.includes("stavitel") && lowerName.includes("zahrad")) return dlazdicStavitelZahradaBg;
    if (lowerName.includes("pokládka zámkové dlažby")) return pokladkaZamkoveDlazbyBg;
    if (lowerName.includes("zámkov") && lowerName.includes("dlažb")) return pavingStonesBg;
    if (lowerName.includes("stavba plotu") && lowerName.includes("pletivo")) return stavbaPlotupletivoBg;
    if (lowerName.includes("stavba plotu") && lowerName.includes("beton")) return fenceInstallationBg;
    if (lowerName.includes("stavba plotu")) return fenceInstallationBg;
    if (lowerName.includes("zahradní") && lowerName.includes("domku")) return gardenPergolaBg;
    if (lowerName.includes("pergol")) return gardenPergolaBg;
    if (lowerName.includes("podhrabov")) return fenceInstallationBg;
    if (lowerName.includes("výkop") && (lowerName.includes("bazén") || lowerName.includes("jezírk"))) return excavationBg;
    if (lowerName.includes("zavlažov") || lowerName.includes("závlah")) return irrigationSystemBg;
    if (lowerName.includes("zatravňovací")) return pavingStonesBg;
    if (lowerName.includes("založení") && lowerName.includes("trávník")) return lawnInstallationBg;
    if (lowerName.includes("tera") && lowerName.includes("stav")) return terraceConstructionBg;
    // Transport
    if (lowerName.includes("kurýr")) return courierBg;
    if (lowerName.includes("přeprava") && lowerName.includes("osob")) return passengerTransportBg;
    if (lowerName.includes("přeprava") && lowerName.includes("nábytk")) return movingBg;
    if (lowerName.includes("vnitrostátní") && lowerName.includes("doprav")) return freightTransportBg;
    // Truhlářství
    if (lowerName === "truhlář") return carpenterBg;
    if (lowerName.includes("výroba kuchyňské linky")) return kitchenCabinetBg;
    if (lowerName.includes("výroba vestavěné skříně")) return wardrobeBuiltInBg;
    if (lowerName.includes("renovace") && lowerName.includes("nábytk")) return furnitureRestorationBg;
    if (lowerName.includes("nábytek") && lowerName.includes("vestav")) return wardrobeBuiltInBg;
    if (lowerName.includes("nábytek a vestavby")) return wardrobeBuiltInBg;
    // Dlaždič / Stavitel (general, not in garden context)
    if (lowerName === "dlaždič / stavitel") return tilerBg;
    // Výuka a jazyky - specific matches first
    if (lowerName.includes("španělštin")) return spanishLessonBg;
    if (lowerName.includes("francouzštin")) return frenchLessonBg;
    if (lowerName.includes("český jazyk") || lowerName.includes("češtin")) return czechTutoringBg;
    if (lowerName.includes("fyzik") || lowerName.includes("chemi")) return physicsChemistryBg;
    if (lowerName.includes("přijímací") || lowerName.includes("maturit")) return examPrepBg;
    if (lowerName.includes("bozp") || lowerName.includes("požární")) return safetyTrainingBg;
    if (lowerName.includes("první pomoc")) return firstAidTrainingBg;
    if (lowerName.includes("počítačový kurz") || lowerName.includes("excel")) return computerCourseBg;
    if (lowerName.includes("kreslení") || lowerName.includes("malování") && lowerName.includes("kurz")) return drawingPaintingCourseBg;
    if (lowerName.includes("keramick")) return ceramicsCourseBg;
    if (lowerName.includes("kurz šití") || lowerName.includes("šití")) return sewingCourseBg;
    if (lowerName.includes("korektur")) return proofreadingBg;
    if (lowerName.includes("tlumočení") || lowerName.includes("simultánní")) return interpretingBg;
    if (lowerName.includes("angličtin") || lowerName.includes("výuka")) return englishLessonBg;
    if (lowerName.includes("školení")) return englishLessonBg;
    if (lowerName.includes("překlad")) return translationBg;
    if (lowerName.includes("kurz")) return englishLessonBg;
    if (lowerName.includes("právní a administrativní") || lowerName.includes("právní služby")) return legalGavelBg;
    if (lowerName.includes("notář")) return notaryBg;
    if (lowerName.includes("právní")) return legalGavelBg;
    if (lowerName.includes("oceňovat") || lowerName.includes("znalec")) return notaryBg;
    if (lowerName.includes("správa") && lowerName.includes("nemovit")) return notaryBg;
    if (lowerName.includes("stavební znalec")) return architectBg;
    // Elektro - Elektroinstalace section (PROMINENT subcategories with unique images)
    if (lowerName.includes("elektrikář") && lowerName.includes("obecná")) return elektroInstallationBg;
    if (lowerName.includes("diagnostika závady") && !lowerName.includes("auto")) return elektroDiagnostikaBg;
    if (lowerName.includes("elektrikářská pohotovost")) return elektroPohotovostBg;
    // Elektro - Elektroinstalace section (other subcategories)
    if (lowerName.includes("elektroinstalace")) return elektroInstallationBg;
    if (lowerName.includes("revize elektro")) return elektroInstallationBg;
    if (lowerName.includes("domovní rozvody")) return elektroInstallationBg;
    if (lowerName.includes("inteligentní domácnost")) return elektroInstallationBg;
    if (lowerName.includes("oprava elektroniky")) return elektroInstallationBg;
    // Elektro - Internet a Zabezpečení section (PROMINENT subcategories with unique images)
    if (lowerName.includes("it technik") && lowerName.includes("obecná")) return wifiNetworkBg;
    if (lowerName.includes("nastavení wi-fi") || lowerName.includes("wi-fi routeru")) return wifiRouterBg;
    if (lowerName.includes("montáž zabezpečovacího") || (lowerName.includes("alarm") && !lowerName.includes("domácí"))) return alarmMontazBg;
    // Elektro - Internet a Zabezpečení section (other subcategories)
    if (lowerName.includes("síťová infrastruktura")) return wifiNetworkBg;
    if (lowerName.includes("zabezpečovací")) return alarmSecurityBg;
    if (lowerName.includes("kamerový systém")) return alarmSecurityBg;
    if (lowerName.includes("videotelefon")) return alarmSecurityBg;
    if (lowerName.includes("požární systém")) return alarmSecurityBg;
    // Elektro - Fotovoltaika section (PROMINENT subcategories with unique images)
    if (lowerName.includes("fotovoltaika") && lowerName.includes("obecná")) return solarPanelBg;
    if (lowerName.includes("instalace fve")) return solarInstallationBg;
    if (lowerName.includes("servis a revize fve")) return fveServisBg;
    // Elektro - Fotovoltaika section (other subcategories)
    if (lowerName.includes("fotovoltaik") || lowerName.includes("fve")) return solarPanelBg;
    if (lowerName.includes("solární") || lowerName.includes("fotonaponsk")) return solarPanelBg;
    if (lowerName.includes("bateriová úložiště")) return solarPanelBg;
    if (lowerName.includes("tepelné čerpadlo")) return solarPanelBg;
    // Match EV only as a standalone word, so we don't catch words like "revize"
    if (lowerName.includes("wallbox") || /\bev\b/i.test(lowerName)) return solarPanelBg;
    // Instalatér - Vodoinstalace section (PROMINENT subcategories with unique images)
    if (lowerName.includes("instalatér") && lowerName.includes("obecná")) return plumbingGeneralBg;
    if (lowerName.includes("diagnostika závady") && lowerName.includes("vod")) return waterLeakDetectionBg;
    if (lowerName.includes("instalatérská pohotovost")) return emergencyPlumbingBg;
    // Instalatér - Vodoinstalace section (other subcategories) - UNIQUE IMAGES
    if (lowerName.includes("baterie") && (lowerName.includes("vodovodní") || lowerName.includes("stojánk") || lowerName.includes("nástěnn"))) return faucetInstallationBg;
    if (lowerName.includes("wc") || lowerName.includes("záchod")) return toiletInstallationBg;
    if (lowerName.includes("umyvadl") || lowerName.includes("dřez")) return sinkDrainBg;
    if (lowerName.includes("odpad") || lowerName.includes("sifon")) return sinkDrainBg;
    if (lowerName.includes("geberit") || lowerName.includes("podomítkov")) return geberitInstallationBg;
    if (lowerName.includes("vana") || lowerName.includes("sprch")) return bathtubShowerBg;
    if (lowerName.includes("silikono")) return siliconeSealingBg;
    if (lowerName.includes("roháčk") || lowerName.includes("ventil")) return waterValveBg;
    if (lowerName.includes("kapající")) return leakyFaucetBg;
    if (lowerName.includes("pračk") || lowerName.includes("myčk")) return washingMachineBg;
    if (lowerName.includes("kanalizac")) return drainCleaningBg;
    if (lowerName.includes("rozvody vody")) return waterPipesBg;
    if (lowerName.includes("vodoměr")) return waterMeterBg;
    // Instalatér - Topení section (PROMINENT subcategories with unique images)
    if (lowerName === "topenář") return heatingTechnicianBg;
    if (lowerName.includes("topenář") && lowerName.includes("obecná")) return heatingTechnicianBg;
    if (lowerName.includes("servis") && lowerName.includes("kotle")) return boilerServiceBg;
    if (lowerName.includes("napuštění") || lowerName.includes("odvzdušnění")) return heatingRadiatorBg;
    // Instalatér - Topení section (other subcategories)
    if (lowerName.includes("radiátor")) return heatingRadiatorBg;
    if (lowerName.includes("termohlavic")) return heatingRadiatorBg;
    if (lowerName.includes("proplach") && lowerName.includes("topn")) return heatingRadiatorBg;
    if (lowerName.includes("podlahov") && lowerName.includes("topení")) return underfloorHeatingBg;
    if (lowerName.includes("kotle") || lowerName.includes("kotel")) return heatingBoilerBg;
    if (lowerName.includes("tepelné čerpadlo")) return heatingBoilerBg;
    // Instalatér - Plyn section (PROMINENT subcategories with unique images)
    if (lowerName === "plynař") return gasTechnicianBg;
    if (lowerName.includes("plynař") && lowerName.includes("obecná")) return gasTechnicianBg;
    if (lowerName.includes("připojení") && lowerName.includes("plynového sporáku")) return gasStoveConnectionBg;
    if (lowerName.includes("revize") && lowerName.includes("plyn")) return gasRevisionBg;
    // Instalatér - Plyn section (other subcategories)
    if (lowerName.includes("rozvody plynu")) return gasPipesBg;
    if (lowerName.includes("těsnost") && lowerName.includes("plyn")) return gasRevisionBg;
    if (lowerName.includes("odpojení") && lowerName.includes("plyn")) return gasRevisionBg;
    // (Stavby/Rekonstrukce rules moved to top of getBackgroundImage function)
    // Finanční služby
    if (lowerName.includes("finanční poradce")) return financialAdvisorBg;
    if (lowerName.includes("sjednání hypotéky") || lowerName.includes("refinancování")) return financialAdvisorBg;
    if (lowerName.includes("sjednání pojištění")) return insuranceAgentBg;
    if (lowerName.includes("pojištění") && lowerName.includes("odpovědnost")) return carInsuranceBg;
    if (lowerName.includes("pojištění") && lowerName.includes("firm")) return carInsuranceBg;
    if (lowerName.includes("leasing") && lowerName.includes("auto")) return carLeasingBg;
    if (lowerName.includes("vedení daňové evidence") || lowerName.includes("zpracování daňového")) return taxCalculatorBg;
    if (lowerName.includes("účetní") && lowerName.includes("obecná")) return accountingBg;
    if (lowerName.includes("úvěr") || lowerName.includes("poradc")) return accountingBg;
    if (lowerName.includes("účet") || lowerName.includes("kancelář")) return accountingBg;
    // Hlídání a péče
    if (lowerName.includes("péče o seniory")) return elderlyCareBg;
    if (lowerName.includes("doprovod k lékaři") || lowerName.includes("na úřad")) return seniorEscortBg;
    if (lowerName.includes("pomoc s hygienou")) return elderlyCareBg;
    if (lowerName.includes("hlídání koček")) return catSittingBg;
    // PC a Mobily / Elektro
    if (lowerName.includes("it technik")) return itTechnicianBg;
    // Pro firmy
    if (lowerName.includes("asistentka") || lowerName.includes("virtuální asistent")) return assistantBg;
    if (lowerName.includes("grafik") || lowerName.includes("marketer") || lowerName.includes("tvorba loga")) return graphicDesignerBg;
    if (lowerName.includes("tvorba webových stránek")) return itTechnicianBg;
    // Elektrikář (fallback)
    if (lowerName.includes("elektroinstalace") || lowerName.includes("elektrikář")) return elektroInstallationBg;
    if (lowerName.includes("elektrik") && lowerName.includes("pohotovost")) return elektroInstallationBg;
    if (lowerName.includes("ostatní elektrikář")) return elektroInstallationBg;
    // Hodinový manžel
    if (lowerName.includes("zapojení")) return applianceRepairBg;
    // Obchodní služby
    if (lowerName.includes("polygraf")) return printingServicesBg;
    if (lowerName.includes("dávkovač") || (lowerName.includes("distributor") && lowerName.includes("vod"))) return waterDispenserBg;
    // Truhlářství / Nábytek
    if (lowerName.includes("nábytek a vestavby") || lowerName.includes("nábytek na míru")) return customFurnitureBg;
    // Právní a administrativní služby
    if (lowerName.includes("právní a administrativní služby") || lowerName.includes("právní služby")) return legalServicesBg;
    if (lowerName.includes("správa nemovitostí")) return propertyManagementBg;
    if (lowerName.includes("oceňovatel") || lowerName.includes("znalec")) return propertyValuatorBg;
    if (lowerName.includes("stavební znalec")) return buildingInspectorBg;
    if (lowerName.includes("pojišťovací agent") || lowerName.includes("pojištění")) return insuranceAgentBg;
    // Organizace akcí
    if (lowerName.includes("organizace firemních") || lowerName.includes("firemní akc")) return corporateEventBg;
    if (lowerName.includes("dětský animátor")) return kidsAnimatorBg;
    if (lowerName.includes("svatební dort") || lowerName.includes("dorty na zakázku")) return weddingCakeBg;
    if (lowerName.includes("svatební fotograf") || lowerName.includes("svatební foto")) return weddingPhotographyBg;
    if (lowerName.includes("auto na svatbu") || lowerName.includes("svatební auto")) return weddingCarBg;
    if (lowerName.includes("svatební kapela") || lowerName.includes("svatební orchestr")) return weddingBandBg;
    if (lowerName.includes("limuzín")) return limousineRentalBg;
    if (lowerName.includes("mikrobus") || lowerName.includes("dodávek")) return minibusRentalBg;
    // Transport
    if (lowerName.includes("nákladní doprava") || lowerName.includes("nákladní přeprav")) return cargoTransportBg;
    // Zahradnictví
    if (lowerName.includes("sekání trávy") || lowerName.includes("sekání trávník")) return lawnMowingBg;
    if (lowerName.includes("stříhání živých plotů") || lowerName.includes("prořezávání keřů")) return hedgeTrimmingBg;
    if (lowerName.includes("stavba terasy") || lowerName.includes("terasa")) return terraceConstructionBg;
    if (lowerName.includes("zavlažování") || lowerName.includes("zavlažovací")) return irrigationSystemBg;
    // Úklid
    if (lowerName.includes("čištění sedačk") || lowerName.includes("čištění pohovk") || lowerName.includes("čištění čaloun")) return sofaCleaningBg;
    if (lowerName.includes("čištění matrací") || lowerName.includes("čištění matrac")) return mattressCleaningBg;
    if (lowerName.includes("tlakové čištění") || lowerName.includes("vysokotlaké mytí")) return pressureWashingBg;
    if (lowerName.includes("čištění bazén")) return poolCleaningBg;
    if (lowerName.includes("dezinfekce") || lowerName.includes("dezinfekční")) return disinfectionBg;
    if (lowerName.includes("úklid po rekonstrukc")) return postRenovationCleaningBg;
    // Výuka a jazyky
    if (lowerName.includes("výuka němčin") || lowerName.includes("němčin")) return germanLessonBg;
    if (lowerName.includes("doučování matemat") || lowerName.includes("matematika")) return mathTutoringBg;
    if (lowerName.includes("klavír") || lowerName.includes("hra na klavír")) return pianoLessonBg;
    if (lowerName.includes("kytara") || lowerName.includes("hra na kytaru")) return guitarLessonBg;
    // Zdraví a krása
    if (lowerName.includes("prodlužování řas") || lowerName.includes("prodloužení řas")) return eyelashExtensionBg;
    if (lowerName.includes("permanentní make-up") || lowerName.includes("permanentní makeup")) return permanentMakeupBg;
    if (lowerName.includes("pedikúra")) return pedicureBg;
    if (lowerName.includes("dietolog") || lowerName.includes("výživov") || lowerName.includes("jídelníč")) return nutritionistBg;
    if (lowerName.includes("jóga") || lowerName.includes("yoga")) return yogaClassBg;
    // Mazlíčci
    if (lowerName.includes("psí salon") || lowerName.includes("stříhání psů")) return dogGroomingBg;
    if (lowerName.includes("venčení")) return dogWalkingBg;
    if (lowerName.includes("hlídání psů") || lowerName.includes("hlídání koček")) return petSittingBg;
    if (lowerName.includes("výcvik")) return dogTrainingBg;
    if (lowerName.includes("psí hotel") || lowerName.includes("domácí hlídání")) return dogHotelBg;
    if (lowerName.includes("koupání") || lowerName.includes("vyčesávání") || lowerName.includes("trimování")) return dogBathingBg;
    if (lowerName.includes("drápků")) return dogNailTrimBg;
    if (lowerName.includes("fyzioterapie") && lowerName.includes("psy")) return dogPhysiotherapyBg;
    // Další služby
    if (lowerName === "švadlena / krejčová" || lowerName.includes("švadlena") && !lowerName.includes("oprav")) return tailorBg;
    if (lowerName.includes("krejčová") && lowerName.includes("opravy oděvů")) return tailorBg;
    if (lowerName.includes("oprava obuvi") || lowerName.includes("podpatky") || lowerName.includes("lepení")) return shoeRepairBg;
    if (lowerName.includes("konzultace s advokátem") || lowerName === "advokát") return lawyerBg;
    if (lowerName.includes("sepis kupní smlouvy")) return legalServicesBg2;
    if (lowerName === "chůva") return nannyBg;
    if (lowerName.includes("hlídání dětí") && lowerName.includes("nárazové")) return kidsAnimatorBg;
    if (lowerName.includes("pravidelné hlídání dětí")) return nannyBg;
    if (lowerName === "hodinový manžel") return handymanBg;
    if (lowerName.includes("vrtání do zdi") || lowerName.includes("beton") && lowerName.includes("cihla")) return wallDrillingBg;
    if (lowerName.includes("montáž garnýží") || lowerName.includes("záclonových tyčí")) return curtainRodBg;
    // New batch 5 - Manikérka, Masér, etc.
    if (lowerName.includes("manikérka") || lowerName.includes("pedikérka") || lowerName.includes("manikérka / pedikérka")) return manicurePedicureBg;
    if (lowerName === "masér" || (lowerName.includes("masér") && !lowerName.includes("fyzio"))) return massageTherapistBg;
    if (lowerName.includes("fyzioterapie") && !lowerName.includes("psy") || lowerName.includes("rehabilitace")) return physiotherapyRehabBg;
    if (lowerName.includes("lektor jazyků") || lowerName === "lektor jazyků") return languageTeacherBg;
    if (lowerName.includes("konverzace s rodilým mluvčím") || lowerName.includes("rodilý mluvčí")) return nativeSpeakerBg;
    if (lowerName === "doučování" || (lowerName.includes("doučování") && !lowerName.includes("matemat"))) return tutoringPrivateBg;
    if (lowerName.includes("učitel hudby") || lowerName.includes("učitel umění")) return musicArtTeacherBg;
    if (lowerName === "překladatel" || (lowerName.includes("překladatel") && !lowerName.includes("soudní"))) return translatorBg;
    if (lowerName.includes("soudní překlad") || lowerName.includes("soudní překladatel")) return courtTranslatorBg;
    if (lowerName.includes("běžný překlad textu") || lowerName.includes("překlad textu")) return textTranslationBg;
    if (lowerName === "uklízečka" || lowerName.includes("uklízečka")) return houseCleanerBg;
    if (lowerName.includes("pravidelný úklid") || lowerName.includes("luxování") || lowerName.includes("vytírání") || lowerName.includes("prach")) return regularCleaningBg;
    if (lowerName.includes("generální úklid") || lowerName.includes("kompletní")) return deepCleaningBg;
    if (lowerName.includes("čištění koberců") && lowerName.includes("sedaček")) return carpetSofaCleaningBg;
    if (lowerName.includes("tepování koberců") || lowerName.includes("strojní")) return carpetSteamCleaningBg;
    if (lowerName.includes("tepování sedací soupravy")) return sofaSteamCleaningBg;
    if (lowerName === "úklid venku" || lowerName.includes("úklid venku")) return outdoorCleaningBg;
    if (lowerName.includes("tlakové mytí fasády") || lowerName.includes("wap")) return pressureWashFacadeBg;
    if (lowerName.includes("čištění okapů")) return gutterCleaningProfessionalBg;
    if (lowerName.includes("úklidová firma") || lowerName.includes("úklid kanceláří")) return officeCleaningCompanyBg;
    if (lowerName.includes("vyklízení bytu") || lowerName.includes("pozůstalosti")) return apartmentClearanceBg;
    if (lowerName.includes("výuka hry na klavír") || lowerName.includes("klávesy")) return pianoKeyboardLessonBg;
    if (lowerName.includes("výuka hry na kytaru")) return guitarLessonProfessionalBg;
    if (lowerName.includes("odborné kurzy")) return professionalCourseBg;
    if (lowerName.includes("kondiční jízdy") || lowerName.includes("autoškola")) return drivingPracticeBg;
    if (lowerName.includes("kurz účetnictví")) return accountingCourseBg;
    // New batch 6 - Wedding/Event services
    if (lowerName.includes("svatební koordinátor") || lowerName.includes("svatební koordinace")) return weddingCoordinatorBg;
    if (lowerName.includes("svatební výzdoba") || lowerName.includes("květiny")) return weddingDecorationBg;
    if (lowerName.includes("narozeninový dort")) return birthdayCakeBg;
    if (lowerName.includes("dj na oslavu") || lowerName.includes("dj na večírek")) return partyDjBg;
    if (lowerName.includes("dj na svatbu") || lowerName.includes("dj / kapela")) return djWeddingBg;
    if (lowerName.includes("živá kapela")) return liveBandBg;
    if (lowerName.includes("svatební fotograf") || lowerName.includes("celodenní")) return weddingPhotographerBg;
    return null;
  };

  // Render for new section-based structure (Autoservis style)
  if (hasSections) {
    // Get first subcategory to determine section icon
    // Define section order for different categories
    const getSectionOrder = (catName: string) => {
      if (catName === 'Elektro') {
        return ['Elektroinstalace', 'Internet a Zabezpečení', 'Fotovoltaika'];
      }
      if (catName === 'Instalatér') {
        return ['Vodoinstalace', 'Topení', 'Plyn'];
      }
      if (catName === 'Hodinový manžel') {
        return ['Montáže', 'Drobné opravy'];
      }
      if (catName === 'Zahrada') {
        return ['Údržba zeleně', 'Stavby a Úpravy'];
      }
      return ['Autoservis', 'Pneuservis', 'Autoelektrika', 'Karoserie a skla', 'Ostatní auto služby', 'Motocykly'];
    };
    const sectionOrder = getSectionOrder(categoryName);
    const orderedSections = Object.entries(sections).sort(([a], [b]) => {
      const aIndex = sectionOrder.indexOf(a);
      const bIndex = sectionOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:max-w-3xl md:max-h-[80vh] md:rounded-lg md:p-6">
          <DialogHeader className="p-4 md:p-0 border-b md:border-b-0 border-border">
            <DialogTitle>Vyberte podkategorii pro {categoryName}</DialogTitle>
            <p className="text-sm text-muted-foreground">Vyberte konkrétní službu, kterou potřebujete</p>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(100dvh-100px)] md:h-[60vh] px-4 md:pr-4 md:px-0">
            <div className="space-y-6 pb-20 md:pb-4">
              {orderedSections.map(([sectionName, sectionData]) => {
                const firstSubcategory = [...sectionData.prominent, ...sectionData.standard, ...sectionData.hidden][0];
                const SectionIcon = getSectionIcon(firstSubcategory?.section_icon);
                const hiddenCount = sectionData.hidden.length;
                const isExpanded = expandedSections[sectionName] || false;

                return (
                  <div key={sectionName} className="space-y-3">
                    {/* Section header with icon */}
                    <div className="flex items-center gap-2">
                      <SectionIcon className="h-4 w-4 text-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">{sectionName}</h4>
                    </div>
                    
                    {/* Prominent items with background images - swipable on mobile, grid on desktop */}
                    {sectionData.prominent.length > 0 && (
                      <>
                        {/* Mobile: Swipable carousel */}
                        <div className="md:hidden">
                          <Carousel
                            opts={{
                              align: "start",
                              loop: false,
                            }}
                            className="w-full"
                          >
                            <CarouselContent className="-ml-2">
                              {sectionData.prominent.map((sub) => {
                                const bgImage = getBackgroundImage(sub.name);
                                return (
                                  <CarouselItem key={sub.id} className="pl-2 basis-[45%]">
                                    <Button
                                      variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                                      className={`relative overflow-hidden flex flex-col justify-end items-center pb-3 h-32 w-full text-center whitespace-normal text-xs font-semibold rounded-2xl px-3 ${!bgImage ? 'bg-card border-border' : ''}`}
                                      onClick={() => {
                                        onSelect(sub.id);
                                        onOpenChange(false);
                                      }}
                                      style={bgImage ? {
                                        backgroundImage: `url(${withImageCacheBust(bgImage)})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                      } : undefined}
                                    >
                                      {bgImage && (
                                        <div 
                                          className="absolute inset-0 rounded-2xl pointer-events-none"
                                          style={{
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)'
                                          }}
                                        />
                                      )}
                                      <span className={`relative z-10 text-center ${bgImage ? 'text-white drop-shadow-lg' : 'text-foreground'}`}>{sub.name}</span>
                                    </Button>
                                  </CarouselItem>
                                );
                              })}
                            </CarouselContent>
                          </Carousel>
                        </div>
                        
                        {/* Desktop: Grid layout */}
                        <div className="hidden md:grid grid-cols-3 gap-2">
                          {sectionData.prominent.map((sub) => {
                            const bgImage = getBackgroundImage(sub.name);
                            return (
                              <Button
                                key={sub.id}
                                variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                                className={`relative overflow-hidden flex flex-col justify-end items-center pb-2 h-28 text-center whitespace-normal text-xs font-semibold rounded-2xl px-3 ${!bgImage ? 'bg-card border-border' : ''}`}
                                onClick={() => {
                                  onSelect(sub.id);
                                  onOpenChange(false);
                                }}
                                style={bgImage ? {
                                  backgroundImage: `url(${withImageCacheBust(bgImage)})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                } : undefined}
                              >
                                {bgImage && (
                                  <div 
                                    className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{
                                      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)'
                                    }}
                                  />
                                )}
                                <span className={`relative z-10 text-center ${bgImage ? 'text-white drop-shadow-lg' : 'text-foreground'}`}>{sub.name}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    
                    {/* Standard items */}
                    {sectionData.standard.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {sectionData.standard.map((sub) => (
                          <Button
                            key={sub.id}
                            variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                            className="justify-center items-center h-12 text-center whitespace-normal text-xs rounded-lg px-2 bg-card border-border hover:bg-primary/20 hover:text-foreground hover:border-primary/30"
                            onClick={() => {
                              onSelect(sub.id);
                              onOpenChange(false);
                            }}
                          >
                            {sub.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {/* Hidden items with expand button */}
                    {hiddenCount > 0 && (
                      <>
                        {isExpanded && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {sectionData.hidden.map((sub) => (
                              <Button
                                key={sub.id}
                                variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                                className="justify-center items-center h-12 text-center whitespace-normal text-xs rounded-lg px-2 bg-card border-border hover:bg-primary/20 hover:text-foreground hover:border-primary/30"
                                onClick={() => {
                                  onSelect(sub.id);
                                  onOpenChange(false);
                                }}
                              >
                                {sub.name}
                              </Button>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toggleSection(sectionName)}
                        >
                          <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {isExpanded ? 'Skrýt' : `Zobrazit dalších ${hiddenCount} úkonů`}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Legacy rendering for other categories
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:max-w-3xl md:max-h-[80vh] md:rounded-lg md:p-6">
        <DialogHeader className="p-4 md:p-0 border-b md:border-b-0 border-border">
          <DialogTitle>Vyberte podkategorii pro {categoryName}</DialogTitle>
          <p className="text-sm text-muted-foreground">Vyberte konkrétní službu, kterou potřebujete</p>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(100dvh-100px)] md:h-[60vh] px-4 md:pr-4 md:px-0">
          <div className="space-y-6 pb-20 md:pb-4">
            {hasProminent && (
              <>
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Hlavní služby</h4>
                  <div className="flex flex-wrap gap-3">
                    {prominent.map((sub) => {
                      const bgImage = getBackgroundImage(sub.name);
                      return (
                        <Button
                          key={sub.id}
                          variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                          className="relative overflow-hidden flex flex-col justify-end items-center pb-2 h-28 text-center whitespace-normal text-xs font-semibold rounded-2xl px-6 flex-1 min-w-[calc(50%-0.375rem)] md:min-w-[200px]"
                          onClick={() => {
                            onSelect(sub.id);
                            onOpenChange(false);
                          }}
                          style={bgImage ? {
                            backgroundImage: `url(${bgImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : undefined}
                        >
                          {bgImage && (
                            <div 
                              className="absolute inset-0 rounded-2xl pointer-events-none"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)'
                              }}
                            />
                          )}
                          <span className="relative z-10 text-white drop-shadow-lg text-center">{sub.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Další</h4>
                </div>
              </>
            )}
            
            {hasGroups ? (
              <>
                {Object.entries(grouped).map(([groupName, subs]) => (
                  <div key={groupName} className="space-y-3">
                    {groupName !== "Dále" && groupName !== "Další" && (
                      <h4 className="text-xs font-semibold text-foreground">{groupName}</h4>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {subs.map((sub) => (
                        <Button
                          key={sub.id}
                          variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                          className="justify-center items-center h-12 text-center whitespace-normal text-xs rounded-lg px-2 hover:bg-primary/20 hover:text-foreground hover:border-primary/30"
                          onClick={() => {
                            onSelect(sub.id);
                            onOpenChange(false);
                          }}
                        >
                          {sub.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-foreground">Ostatní</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {ungrouped.map((sub) => (
                        <Button
                          key={sub.id}
                          variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                          className="justify-center items-center h-12 text-center whitespace-normal text-xs rounded-lg px-2 hover:bg-primary/20 hover:text-foreground hover:border-primary/30"
                          onClick={() => {
                            onSelect(sub.id);
                            onOpenChange(false);
                          }}
                        >
                          {sub.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {subcategories.map((sub) => (
                  <Button
                    key={sub.id}
                    variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                    className="justify-center items-center h-12 text-center whitespace-normal text-xs rounded-lg px-2 hover:bg-primary/20 hover:text-foreground hover:border-primary/30"
                    onClick={() => {
                      onSelect(sub.id);
                      onOpenChange(false);
                    }}
                  >
                    {sub.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SubcategoryDialog;

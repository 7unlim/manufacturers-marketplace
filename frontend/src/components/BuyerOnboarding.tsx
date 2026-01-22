import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, ArrowLeft, ShoppingCart, Building2, Home, Factory, Sparkles, DollarSign, Package, Wrench, Briefcase, Zap, Input } from "lucide-react";
import { Input as UIInput } from "@/components/ui/input";

export type BuyerOnboardingData = {
  materialTypes: string[];
  buyerProjectTypes: string[]; // Renamed to avoid conflict with seller onboarding
  projectScale: string[];
  budgetRange?: string;
  urgencyLevel?: string;
};

type BuyerOnboardingProps = {
  onComplete: (data: BuyerOnboardingData) => void;
  onSkip?: () => void;
  initialData?: BuyerOnboardingData;
};

const MATERIAL_TYPES = [
  "Metals",
  "Concrete & Masonry",
  "Wood & Framing",
  "Electrical Equipment",
  "Fire Protection",
  "Plumbing",
  "HVAC / Mechanical",
  "Insulation & Envelope",
  "Glass & Finishes",
  "Structural Steel & Fasteners",
  "Specialty Systems"
];

const PROJECT_TYPES = {
  "Home Projects": {
    icon: Home,
    options: [
      "Home renovation",
      "Kitchen remodel",
      "Bathroom upgrade",
      "Deck/patio construction",
      "Roofing replacement",
      "Basement finishing",
      "Home addition",
      "Landscaping hardscape"
    ]
  },
  "Residential Construction": {
    icon: Building2,
    options: [
      "Single-family homes",
      "Multi-family housing",
      "Townhouses",
      "Condominiums",
      "Apartment complexes"
    ]
  },
  "Commercial Construction": {
    icon: Briefcase,
    options: [
      "Office buildings",
      "Retail stores",
      "Restaurants",
      "Hotels",
      "Shopping centers",
      "Warehouses"
    ]
  },
  "Industrial Projects": {
    icon: Factory,
    options: [
      "Manufacturing facilities",
      "Distribution centers",
      "Processing plants",
      "Industrial warehouses"
    ]
  },
  "Infrastructure Projects": {
    icon: Wrench,
    options: [
      "Roads and highways",
      "Bridges",
      "Water treatment facilities",
      "Public utilities"
    ]
  }
};

const PROJECT_SCALES = [
  "Small project (< $50K)",
  "Medium project ($50K - $500K)",
  "Large project ($500K - $5M)",
  "Enterprise project (> $5M)"
];

const BUDGET_RANGES = [
  "Under $10,000",
  "$10,000 - $50,000",
  "$50,000 - $250,000",
  "$250,000 - $1,000,000",
  "Over $1,000,000",
  "Prefer not to specify"
];

const URGENCY_LEVELS = [
  "Planning phase (6+ months)",
  "Design phase (3-6 months)",
  "Ready to purchase (1-3 months)",
  "Urgent (Within 1 month)",
  "Emergency (Immediate need)"
];

const BuyerOnboarding = ({ onComplete, onSkip, initialData }: BuyerOnboardingProps) => {
  const [step, setStep] = useState(1);
  
  // Extract "Other" entries from initial data
  const parseOtherEntries = (entries: string[], prefix: string) => {
    const other = entries.find(e => e.startsWith(`${prefix}: `));
    return other ? other.replace(`${prefix}: `, '') : '';
  };

  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>(
    initialData?.materialTypes?.filter(m => !m.startsWith('Other: ')) || []
  );
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>(
    initialData?.buyerProjectTypes?.filter(p => !p.startsWith('Other: ')) || []
  );
  const [selectedProjectScales, setSelectedProjectScales] = useState<string[]>(
    initialData?.projectScale?.filter(s => !s.startsWith('Other: ')) || []
  );
  const [budgetRange, setBudgetRange] = useState<string>(initialData?.budgetRange || "");
  const [urgencyLevel, setUrgencyLevel] = useState<string>(initialData?.urgencyLevel || "");
  const [otherMaterialTypes, setOtherMaterialTypes] = useState<string>(
    initialData?.materialTypes ? parseOtherEntries(initialData.materialTypes, 'Other') : ""
  );
  const [otherProjectTypes, setOtherProjectTypes] = useState<string>(
    initialData?.buyerProjectTypes ? parseOtherEntries(initialData.buyerProjectTypes, 'Other') : ""
  );
  const [otherProjectScale, setOtherProjectScale] = useState<string>(
    initialData?.projectScale ? parseOtherEntries(initialData.projectScale, 'Other') : ""
  );

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const toggleMaterialType = (material: string) => {
    setSelectedMaterialTypes(prev =>
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  const toggleProjectType = (category: string, option: string) => {
    const key = `${category} - ${option}`;
    setSelectedProjectTypes(prev =>
      prev.includes(key)
        ? prev.filter(p => p !== key)
        : [...prev, key]
    );
  };

  const toggleProjectScale = (scale: string) => {
    setSelectedProjectScales(prev =>
      prev.includes(scale)
        ? prev.filter(s => s !== scale)
        : [...prev, scale]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    const materialTypes = [...selectedMaterialTypes];
    if (otherMaterialTypes.trim()) {
      materialTypes.push(`Other: ${otherMaterialTypes.trim()}`);
    }

    const projectTypes = [...selectedProjectTypes];
    if (otherProjectTypes.trim()) {
      projectTypes.push(`Other: ${otherProjectTypes.trim()}`);
    }

    const projectScales = [...selectedProjectScales];
    if (otherProjectScale.trim()) {
      projectScales.push(`Other: ${otherProjectScale.trim()}`);
    }

    onComplete({
      materialTypes,
      buyerProjectTypes: projectTypes,
      projectScale: projectScales,
      budgetRange: budgetRange || undefined,
      urgencyLevel: urgencyLevel || undefined,
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedMaterialTypes.length > 0;
      case 2:
        return selectedProjectTypes.length > 0;
      case 3:
        return selectedProjectScales.length > 0;
      case 4:
        return true; // Budget and urgency are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Step {step} of {totalSteps}
            </span>
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip for now
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500 mt-2 text-center">
            Don't worry - you can always update this information later in your profile settings
          </p>
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <ShoppingCart className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">What materials are you looking for?</h2>
                  <p className="text-slate-600">Select the types of materials you typically need for your projects</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MATERIAL_TYPES.map(material => {
                    const isSelected = selectedMaterialTypes.includes(material);
                    return (
                      <button
                        key={material}
                        type="button"
                        onClick={() => toggleMaterialType(material)}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isSelected ? "text-blue-900" : "text-slate-700"}`}>
                            {material}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Other option */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Other material types (optional)</label>
                  <UIInput
                    placeholder="Enter other material types, separated by commas"
                    value={otherMaterialTypes}
                    onChange={(e) => setOtherMaterialTypes(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">What types of projects do you work on?</h2>
                  <p className="text-slate-600">Select all project types that apply to help us match you with the right suppliers</p>
                </div>

                <div className="space-y-4">
                  {Object.entries(PROJECT_TYPES).map(([category, { icon: Icon, options }]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Icon className="w-5 h-5 text-indigo-600" />
                        {category}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {options.map(option => {
                          const key = `${category} - ${option}`;
                          const isSelected = selectedProjectTypes.includes(key);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleProjectType(category, option)}
                              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 shadow-md"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                                  {option}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Other option */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Other project types (optional)</label>
                  <UIInput
                    placeholder="Enter other project types, separated by commas"
                    value={otherProjectTypes}
                    onChange={(e) => setOtherProjectTypes(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <Package className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">What's the scale of your projects?</h2>
                  <p className="text-slate-600">Help us understand the typical size of projects you work on</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROJECT_SCALES.map(scale => {
                    const isSelected = selectedProjectScales.includes(scale);
                    return (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => toggleProjectScale(scale)}
                        className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-green-500 bg-green-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${isSelected ? "text-green-900" : "text-slate-700"}`}>
                            {scale}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Other option */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Other project scale (optional)</label>
                  <UIInput
                    placeholder="Enter other project scale description"
                    value={otherProjectScale}
                    onChange={(e) => setOtherProjectScale(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                    <DollarSign className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">Tell us more about your needs</h2>
                  <p className="text-slate-600">This helps us provide better recommendations (optional)</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Typical Budget Range <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {BUDGET_RANGES.map(range => {
                        const isSelected = budgetRange === range;
                        return (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setBudgetRange(range)}
                            className={`p-3 rounded-lg border-2 text-sm transition-all duration-200 ${
                              isSelected
                                ? "border-purple-500 bg-purple-50 shadow-md"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={isSelected ? "text-purple-900 font-medium" : "text-slate-700"}>
                                {range}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-900">
                      Typical Urgency Level <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </label>
                    <div className="space-y-2">
                      {URGENCY_LEVELS.map(level => {
                        const isSelected = urgencyLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setUrgencyLevel(level)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                              isSelected
                                ? "border-purple-500 bg-purple-50 shadow-md"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={isSelected ? "text-purple-900 font-medium" : "text-slate-700"}>
                                {level}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 gradient-hero text-white"
              >
                {step === totalSteps ? "Complete" : "Next"}
                {step < totalSteps && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerOnboarding;

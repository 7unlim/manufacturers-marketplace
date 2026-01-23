import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, ArrowLeft, Building2, Factory, Wrench, Sparkles, Home, Briefcase, Hammer, Zap, Shield, FileText } from "lucide-react";
import { Input as UIInput } from "@/components/ui/input";

export type OnboardingData = {
  projectTypes: string[];
  role: string[];
  specialCategories: string[];
};

export type CompanyProfileData = {
  name: string;
  phone: string;
  email: string;
  location: string;
  description: string;
  certifications: string[];
};

type OnboardingProps = {
  onComplete: (data: OnboardingData, companyData?: CompanyProfileData) => void;
  onSkip?: () => void;
  initialData?: OnboardingData;
  showCompanyProfile?: boolean;
};

const PROJECT_TYPES = {
  "Residential Construction": {
    icon: Home,
    options: ["Single-family houses", "Apartments", "Condos", "Townhomes"]
  },
  "Commercial Construction": {
    icon: Briefcase,
    options: ["Office buildings", "Shopping malls", "Hotels", "Restaurants", "Hospitals", "Schools"]
  },
  "Industrial Construction": {
    icon: Factory,
    options: ["Factories", "Power plants", "Oil & gas facilities", "Refineries", "Warehouses"]
  },
  "Infrastructure / Heavy Civil": {
    icon: Wrench,
    options: ["Bridges", "Highways", "Tunnels", "Airports", "Railways", "Dams"]
  },
  "High-Rise / Skyscraper": {
    icon: Building2,
    options: ["Tall office towers", "High-rise apartments", "Mixed-use skyscrapers"]
  }
};

const ROLES = {
  "General Contractors (GCs)": {
    icon: Hammer,
    specialties: [
      "Manage the entire project",
      "Hire subcontractors",
      "Schedule work",
      "Handle permits",
      "Ensure safety & quality"
    ]
  },
  "Subcontractors": {
    icon: Zap,
    specialties: [
      "Electrical",
      "Plumbing",
      "HVAC",
      "Concrete",
      "Steel framing",
      "Roofing"
    ]
  },
  "Design-Build Firms": {
    icon: FileText,
    specialties: [
      "Both design and construct",
      "One company handles everything"
    ]
  },
  "Engineering, Procurement & Construction (EPC)": {
    icon: Shield,
    specialties: [
      "Power plants",
      "Oil & gas",
      "Large infrastructure"
    ]
  }
};

const SPECIAL_CATEGORIES = [
  "Heavy Civil Contractors",
  "Green Construction Firms",
  "Renovation / Remodeling Companies",
  "Disaster Restoration Companies"
];

const SellerOnboarding = ({ onComplete, onSkip, initialData, showCompanyProfile = false }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  
  // Extract "Other" entries from initial data
  const parseOtherEntries = (entries: string[], prefix: string) => {
    const other = entries.find(e => e.startsWith(`${prefix}: `));
    return other ? other.replace(`${prefix}: `, '') : '';
  };

  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>(
    initialData?.projectTypes?.filter(p => !p.startsWith('Other: ')) || []
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialData?.role?.filter(r => !r.startsWith('Other: ')) || []
  );
  const [selectedSpecialCategories, setSelectedSpecialCategories] = useState<string[]>(
    initialData?.specialCategories?.filter(c => !c.startsWith('Other: ')) || []
  );
  const [otherProjectTypes, setOtherProjectTypes] = useState<string>(
    initialData?.projectTypes ? parseOtherEntries(initialData.projectTypes, 'Other') : ""
  );
  const [otherRoles, setOtherRoles] = useState<string>(
    initialData?.role ? parseOtherEntries(initialData.role, 'Other') : ""
  );
  const [otherSpecialCategories, setOtherSpecialCategories] = useState<string>(
    initialData?.specialCategories ? parseOtherEntries(initialData.specialCategories, 'Other') : ""
  );

  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData>({
    name: "",
    phone: "",
    email: "",
    location: "",
    description: "",
    certifications: []
  });
  const [newCertification, setNewCertification] = useState("");

  const totalSteps = showCompanyProfile ? 4 : 3;
  const progress = (step / totalSteps) * 100;

  const toggleProjectType = (category: string, option: string) => {
    const key = `${category} - ${option}`;
    setSelectedProjectTypes(prev =>
      prev.includes(key)
        ? prev.filter(p => p !== key)
        : [...prev, key]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleSpecialCategory = (category: string) => {
    setSelectedSpecialCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
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
    const projectTypes = [...selectedProjectTypes];
    if (otherProjectTypes.trim()) {
      projectTypes.push(`Other: ${otherProjectTypes.trim()}`);
    }

    const roles = [...selectedRoles];
    if (otherRoles.trim()) {
      roles.push(`Other: ${otherRoles.trim()}`);
    }

    const specialCategories = [...selectedSpecialCategories];
    if (otherSpecialCategories.trim()) {
      specialCategories.push(`Other: ${otherSpecialCategories.trim()}`);
    }

    const onboardingData = {
      projectTypes,
      role: roles,
      specialCategories
    };

    if (showCompanyProfile) {
      onComplete(onboardingData, companyProfile);
    } else {
      onComplete(onboardingData);
    }
  };

  const addCertification = () => {
    if (newCertification.trim() && !companyProfile.certifications.includes(newCertification.trim())) {
      setCompanyProfile({
        ...companyProfile,
        certifications: [...companyProfile.certifications, newCertification.trim()]
      });
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    setCompanyProfile({
      ...companyProfile,
      certifications: companyProfile.certifications.filter(c => c !== cert)
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedProjectTypes.length > 0;
      case 2:
        return selectedRoles.length > 0;
      case 3:
        return true; // Special categories are optional
      case 4:
        return companyProfile.name.trim() !== "" && 
               companyProfile.phone.trim() !== "" && 
               companyProfile.email.trim() !== "";
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                    <Home className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">What types of projects do you work on?</h2>
                  <p className="text-slate-600">Select all that apply to help us match you with the right buyers</p>
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

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <Hammer className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">What's your role in projects?</h2>
                  <p className="text-slate-600">Tell us about your company's specialization</p>
                </div>

                <div className="space-y-4">
                  {Object.entries(ROLES).map(([role, { icon: Icon, specialties }]) => {
                    const isSelected = selectedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`w-full p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            <h3 className={`font-semibold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                              {role}
                            </h3>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        <ul className="space-y-1">
                          {specialties.map(specialty => (
                            <li key={specialty} className={`text-sm ${isSelected ? "text-blue-700" : "text-slate-600"}`}>
                              • {specialty}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                {/* Other option */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Other roles/specializations (optional)</label>
                  <UIInput
                    placeholder="Enter other roles or specializations"
                    value={otherRoles}
                    onChange={(e) => setOtherRoles(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">Any special categories?</h2>
                  <p className="text-slate-600">Select any additional specializations (optional)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SPECIAL_CATEGORIES.map(category => {
                    const isSelected = selectedSpecialCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleSpecialCategory(category)}
                        className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-purple-500 bg-purple-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${isSelected ? "text-purple-900" : "text-slate-700"}`}>
                            {category}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Other option */}
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-700">Other special categories (optional)</label>
                  <UIInput
                    placeholder="Enter other special categories"
                    value={otherSpecialCategories}
                    onChange={(e) => setOtherSpecialCategories(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 4 && showCompanyProfile && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                    <Building2 className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">Company Profile</h2>
                  <p className="text-slate-600">Tell us about your company</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Company Name *</label>
                    <UIInput
                      placeholder="Enter company name"
                      value={companyProfile.name}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Phone *</label>
                      <UIInput
                        placeholder="Enter phone number"
                        value={companyProfile.phone}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Email *</label>
                      <UIInput
                        type="email"
                        placeholder="Enter email"
                        value={companyProfile.email}
                        onChange={(e) => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                        className="w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Location</label>
                    <UIInput
                      placeholder="Enter location (city, state)"
                      value={companyProfile.location}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, location: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      placeholder="Describe your company and services"
                      value={companyProfile.description}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, description: e.target.value })}
                      className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Certifications</label>
                    <div className="flex gap-2">
                      <UIInput
                        placeholder="Add certification (e.g., ISO 9001:2015)"
                        value={newCertification}
                        onChange={(e) => setNewCertification(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCertification();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addCertification} variant="outline">
                        Add
                      </Button>
                    </div>
                    {companyProfile.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {companyProfile.certifications.map((cert, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                          >
                            <span>{cert}</span>
                            <button
                              type="button"
                              onClick={() => removeCertification(cert)}
                              className="text-indigo-500 hover:text-indigo-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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

export default SellerOnboarding;

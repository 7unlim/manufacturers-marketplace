import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, User, Settings, LogOut, ChevronDown, Save, Edit, Info } from "lucide-react";
import BuyerOnboarding, { type BuyerOnboardingData } from "@/components/BuyerOnboarding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { updatePreferences } from "@/lib/api";

const BuyerProfile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [onboardingData, setOnboardingData] = useState<BuyerOnboardingData | null>(null);
  const [buyerName, setBuyerName] = useState<string>("Buyer Account");

  // Load buyer info from localStorage or use defaults
  useEffect(() => {
    // Load account name from authAccount first
    const authAccount = localStorage.getItem("authAccount");
    let accountName = "Buyer Account";
    
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        if (account.name) {
          accountName = account.name;
          setBuyerName(account.name);
        }
        if (account.onboarding) {
          setOnboardingData(account.onboarding);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    const savedName = localStorage.getItem("buyerName") || accountName;
    const savedEmail = localStorage.getItem("buyerEmail") || "";
    const savedPhone = localStorage.getItem("buyerPhone") || "";
    
    setFormData({
      name: savedName,
      email: savedEmail,
      phone: savedPhone,
    });
  }, []);

  const handleSave = () => {
    localStorage.setItem("buyerName", formData.name);
    localStorage.setItem("buyerEmail", formData.email);
    localStorage.setItem("buyerPhone", formData.phone);
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const handleOnboardingSave = async (data: BuyerOnboardingData) => {
    const authAccount = localStorage.getItem("authAccount");
    if (!authAccount) {
      alert("Please sign in again.");
      return;
    }

    try {
      const account = JSON.parse(authAccount);
      if (!account.email) {
        alert("Email not found. Please sign in again.");
        return;
      }

      // Update backend
      const response = await updatePreferences({
        email: account.email,
        onboarding: data,
      });

      // Update localStorage with the response from backend
      const updatedAccount = {
        ...account,
        onboarding: response.account.onboarding,
      };
      localStorage.setItem("authAccount", JSON.stringify(updatedAccount));
      setOnboardingData(data);
      setIsEditingOnboarding(false);
      alert("Preferences updated successfully!");
    } catch (error) {
      console.error("Error updating onboarding:", error);
      alert("Failed to update preferences. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/buyer/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-display font-semibold text-lg">Waypoint</span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <span className="text-sm font-medium">{buyerName}</span>
                <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/buyer/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/buyer/settings" className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth" className="flex items-center text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-display font-bold text-slate-900">Profile</h1>
          <p className="text-slate-600 mt-2">Manage your buyer account information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              ) : (
                <p className="text-sm text-slate-700 py-2">{formData.name || "Not set"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              ) : (
                <p className="text-sm text-slate-700 py-2">{formData.email || "Not set"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm text-slate-700 py-2">{formData.phone || "Not set"}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Preferences */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Material & Project Preferences</span>
              {!isEditingOnboarding && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingOnboarding(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Preferences
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Update your material preferences and project types to get better recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingOnboarding ? (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can always come back to update these preferences later. This helps us match you with the right suppliers and materials.
                  </AlertDescription>
                </Alert>
                <BuyerOnboarding
                  onComplete={handleOnboardingSave}
                  onSkip={() => setIsEditingOnboarding(false)}
                  initialData={onboardingData || undefined}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {onboardingData ? (
                  <>
                    {onboardingData.materialTypes && onboardingData.materialTypes.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Material Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.materialTypes.map((type, idx) => (
                            <Badge key={idx} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {onboardingData.buyerProjectTypes && onboardingData.buyerProjectTypes.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Project Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.buyerProjectTypes.map((type, idx) => (
                            <Badge key={idx} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {onboardingData.projectScale && onboardingData.projectScale.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Project Scale</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.projectScale.map((scale, idx) => (
                            <Badge key={idx} variant="secondary">{scale}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {onboardingData.budgetRange && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Budget Range</Label>
                        <Badge variant="outline">{onboardingData.budgetRange}</Badge>
                      </div>
                    )}
                    {onboardingData.urgencyLevel && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Urgency Level</Label>
                        <Badge variant="outline">{onboardingData.urgencyLevel}</Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p className="mb-2">No preferences set yet</p>
                    <Button variant="outline" onClick={() => setIsEditingOnboarding(true)}>
                      Set Your Preferences
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BuyerProfile;

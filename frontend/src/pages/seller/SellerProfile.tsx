import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, User, Settings, LogOut, ChevronDown, Save, Building2, Edit, Info, Factory, Package, Inbox } from "lucide-react";
import { fetchCompany, updateCompany, updatePreferences, type Company } from "@/lib/api";
import SellerOnboarding, { type OnboardingData } from "@/components/SellerOnboarding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const SellerProfile = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    description: "",
    certifications: "",
  });
  const [saving, setSaving] = useState(false);
  const [isEditingOnboarding, setIsEditingOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [sellerName, setSellerName] = useState<string>("");

  useEffect(() => {
    // Load seller account info to get companyId
    const authAccountStr = localStorage.getItem("authAccount");
    let sellerCompanyId: number | null = null;
    
    if (authAccountStr) {
      try {
        const account = JSON.parse(authAccountStr);
        if (account.companyId) {
          sellerCompanyId = account.companyId;
          setCompanyId(sellerCompanyId);
        }
        if (account.name) {
          setSellerName(account.name);
        }
        if (account.company) {
          setCompany(account.company);
        }
        if (account.onboarding) {
          setOnboardingData(account.onboarding);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    const loadCompany = async () => {
      if (!sellerCompanyId) {
        setLoading(false);
        return;
      }
      try {
        const companyData = await fetchCompany(sellerCompanyId);
        setCompany(companyData);
        setFormData({
          name: companyData.name || "",
          phone: companyData.phone || "",
          email: companyData.email || "",
          location: companyData.location || "",
          description: companyData.description || "",
          certifications: companyData.certifications || "",
        });
      } catch (error) {
        console.error("Failed to load company:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();

  }, []);

  const handleSave = async () => {
    if (!companyId) {
      alert("Company ID not found. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCompany(companyId, formData);
      setCompany(updated);
      setIsEditing(false);
      alert("Company profile updated successfully!");
    } catch (error) {
      console.error("Failed to update company:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOnboardingSave = async (data: OnboardingData) => {
    const authAccountStr = localStorage.getItem("authAccount");
    if (!authAccountStr) {
      alert("Please sign in again.");
      return;
    }

    try {
      const account = JSON.parse(authAccountStr);
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
        company: response.account.company, // Update company info if it changed
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">Waypoint</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Seller</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/seller/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/seller/materials">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/seller/bids">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Inbox className="w-4 h-4 mr-2" />
                  Bid Inbox
                </Button>
              </Link>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <span className="text-sm font-medium">{company?.name || sellerName || "Seller Account"}</span>
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/seller/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Company Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/seller/settings" className="flex items-center">
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
          <h1 className="text-3xl font-display font-bold text-slate-900">Company Profile</h1>
          <p className="text-slate-600 mt-2">Manage your company information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Update your company details and certifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
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

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              ) : (
                <p className="text-sm text-slate-700 py-2">{formData.location || "Not set"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-slate-700 py-2 whitespace-pre-wrap">{formData.description || "Not set"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications">Certifications</Label>
              {isEditing ? (
                <Textarea
                  id="certifications"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  rows={3}
                  placeholder="Enter certifications, one per line or comma-separated"
                />
              ) : (
                <p className="text-sm text-slate-700 py-2 whitespace-pre-wrap">{formData.certifications || "Not set"}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
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
              <span>Company Specializations & Project Types</span>
              {!isEditingOnboarding && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingOnboarding(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Preferences
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Update your project types, roles, and specializations to help buyers find you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingOnboarding ? (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can always come back to update these preferences later. This helps us match you with the right buyers and projects.
                  </AlertDescription>
                </Alert>
                <SellerOnboarding
                  onComplete={handleOnboardingSave}
                  onSkip={() => setIsEditingOnboarding(false)}
                  initialData={onboardingData || undefined}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {onboardingData ? (
                  <>
                    {onboardingData.projectTypes && onboardingData.projectTypes.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Project Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.projectTypes.map((type, idx) => (
                            <Badge key={idx} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {onboardingData.role && onboardingData.role.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Roles & Specializations</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.role.map((role, idx) => (
                            <Badge key={idx} variant="secondary">{role}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {onboardingData.specialCategories && onboardingData.specialCategories.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Special Categories</Label>
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.specialCategories.map((category, idx) => (
                            <Badge key={idx} variant="secondary">{category}</Badge>
                          ))}
                        </div>
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

export default SellerProfile;

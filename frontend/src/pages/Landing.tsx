import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { 
  ArrowRight, Building2, Package, Users, Zap, Shield, BarChart3,
  Target, Award, Globe, Mail, Phone, MapPin, Send, CheckCircle, TrendingUp, Inbox, DollarSign, Info
} from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { fetchRevenueData, type RevenueResponse } from "@/lib/api";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Landing = () => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueResponse | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL'>('1Y');
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [animatedStats, setAnimatedStats] = useState({ companies: 0, materials: 0, uptime: 0, materialsTraded: 0 });
  
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Fetch revenue data when period changes
  useEffect(() => {
    setLoadingRevenue(true);
    fetchRevenueData(chartPeriod)
      .then(data => {
        setRevenueData(data);
        setLoadingRevenue(false);
      })
      .catch(err => {
        console.error('Failed to fetch revenue data:', err);
        setLoadingRevenue(false);
      });
  }, [chartPeriod]);
  
  const chartData = useMemo(() => {
    if (!revenueData) return [];
    
    // Calculate cumulative revenue for each point (reset at window start)
    let cumulative = 0;
    return revenueData.data.map(point => {
      cumulative += point.revenue;
      return {
        label: point.label,
        revenue: point.revenue, // Event revenue (for bars)
        cumulative: cumulative, // Cumulative revenue (for line)
        count: point.count // Event count
      };
    });
  }, [revenueData]);
  
  // Use percentage change from backend (rolling window comparison)
  const totalRevenue = revenueData?.totalRevenue || 0;
  const revenueChange = revenueData?.revenueChange || 0;
  const isPositive = revenueChange >= 0;
  
  // Format the change display
  const revenueChangeDisplay = revenueChange !== 0
    ? `${isPositive ? '+' : ''}${Math.round(revenueChange)}%`
    : '0%';

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    Object.keys(sectionRefs.current).forEach((key) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, key]));
          }
        });
      }, observerOptions);

      if (sectionRefs.current[key]) {
        observer.observe(sectionRefs.current[key]!);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  // Animated counters
  useEffect(() => {
    if (visibleSections.has('stats')) {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;
      
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        
        setAnimatedStats({
          companies: Math.floor(500 * progress),
          materials: Math.floor(2.847 * progress * 1000),
          uptime: Number((99.9 * progress).toFixed(1)),
          materialsTraded: Math.floor(2000 * progress)
        });

        if (step >= steps) {
          clearInterval(timer);
          setAnimatedStats({ companies: 500, materials: 2847, uptime: 99.9, materialsTraded: 2000 });
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [visibleSections]);


  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactForm({ name: '', email: '', company: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">Waypoint</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl float-delayed" />
          <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl float" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-up">
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
              Manage Materials with Precision
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Waypoint helps manufacturing companies track materials, connect with partners, 
              and optimize their supply chain — all in one powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/auth">
                <Button variant="hero" size="xl" className="group pulse-glow">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="hero-outline" size="xl" className="group">
                Watch Demo
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="mt-16 relative float" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 gradient-hero opacity-10 rounded-3xl blur-3xl pulse-glow" />
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden backdrop-blur-sm">
              <div className="h-12 bg-muted/50 flex items-center px-4 gap-2 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-lg">Materials Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Real-time inventory overview</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Live</div>
                  </div>
                </div>
                
                {/* Revenue Chart */}
                <div className="rounded-xl bg-muted/30 border border-border p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl md:text-3xl font-display font-bold text-foreground">
                          ${loadingRevenue ? '...' : totalRevenue.toLocaleString()}
                        </span>
                        {(chartData.length > 1 || chartPeriod === 'YTD') && (
                          <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
                            <TrendingUp className={`w-4 h-4 mr-1 ${!isPositive && 'rotate-180'}`} />
                            {revenueChangeDisplay}
                            <UITooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <button type="button" className="ml-1.5 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                  <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px]">
                                <p className="text-xs leading-relaxed">
                                  <span className="font-semibold">Percentage Change:</span> Compares total revenue in the selected period to the immediately preceding period of equal length. For example, 1M compares last 30 days vs. the 30 days before that.
                                </p>
                              </TooltipContent>
                            </UITooltip>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {loadingRevenue ? 'Loading...' : `${revenueData?.totalPOs || 0} accepted bids`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            chartPeriod === period 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="h-[180px] md:h-[200px] -mx-2">
                    {loadingRevenue ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Loading revenue data...
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No revenue data available for this period
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                          <defs>
                            <linearGradient id="revenueBarGradientLanding" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(38 92% 55%)" stopOpacity={1} />
                              <stop offset="100%" stopColor="hsl(38 92% 45%)" stopOpacity={1} />
                            </linearGradient>
                            <filter id="barShadowLanding">
                              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(38 92% 50%)" floodOpacity="0.15" />
                            </filter>
                          </defs>
                          <XAxis 
                            dataKey="label" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                            dy={10}
                            angle={chartPeriod === '1D' ? -45 : 0}
                            height={chartPeriod === '1D' ? 60 : 36}
                            interval={chartPeriod === '1D' ? 6 : chartPeriod === '1W' ? 2 : chartPeriod === '1M' ? 5 : chartPeriod === '3M' ? 10 : chartPeriod === 'ALL' ? Math.floor(chartData.length / 6) : 'preserveStartEnd'}
                          />
                          <YAxis 
                            hide
                            yAxisId="revenue"
                            domain={[0, 'dataMax + Math.max(1000, dataMax * 0.1)']}
                          />
                          <YAxis 
                            hide
                            yAxisId="cumulative"
                            orientation="right"
                            domain={[0, 'dataMax + Math.max(1000, dataMax * 0.1)']}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '10px',
                              fontSize: '13px',
                              padding: '12px',
                              boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)'
                            }}
                            cursor={{ fill: 'hsl(var(--accent) / 0.1)', stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
                            formatter={(value: number, name: string, props: any) => {
                              if (name === 'revenue') {
                                return [`$${value.toLocaleString()}`, 'Event Revenue'];
                              } else if (name === 'cumulative') {
                                return [`$${value.toLocaleString()}`, 'Cumulative'];
                              }
                              return [value, name];
                            }}
                            labelStyle={{ 
                              color: 'hsl(var(--foreground))', 
                              fontWeight: 600, 
                              marginBottom: '4px',
                              fontSize: '12px'
                            }}
                            itemStyle={{ padding: '2px 0' }}
                          />
                          {/* Event markers (bars) - primary visual */}
                          <Bar
                            yAxisId="revenue"
                            dataKey="revenue"
                            fill="url(#revenueBarGradientLanding)"
                            radius={[4, 4, 0, 0]}
                            opacity={0.95}
                            filter="url(#barShadowLanding)"
                          />
                          {/* Cumulative overlay line - secondary, de-emphasized */}
                          <Line
                            yAxisId="cumulative"
                            type="monotone"
                            dataKey="cumulative"
                            stroke="hsl(221 83% 53%)"
                            strokeWidth={2}
                            strokeOpacity={0.35}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={{ 
                              r: 4, 
                              fill: 'hsl(221 83% 53%)', 
                              stroke: 'hsl(var(--card))', 
                              strokeWidth: 2,
                              opacity: 0.8
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { 
                      label: "Total Materials", 
                      value: "2,847", 
                      change: "+12%",
                      icon: Package, 
                      color: "accent"
                    },
                    { 
                      label: "Active Partners", 
                      value: "156", 
                      change: "+8%",
                      icon: Users, 
                      color: "primary" 
                    },
                    { 
                      label: "Monthly Orders", 
                      value: "1,024", 
                      change: "+23%",
                      icon: Inbox, 
                      color: "accent"
                    },
                    { 
                      label: "Inventory Value", 
                      value: "$2.4M", 
                      change: "+15%",
                      icon: DollarSign, 
                      color: "primary" 
                    },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <div className={`w-8 h-8 rounded-lg ${stat.color === 'accent' ? 'bg-accent' : 'gradient-hero'} flex items-center justify-center`}>
                          <stat.icon className={`w-4 h-4 ${stat.color === 'accent' ? 'text-accent-foreground' : 'text-primary-foreground'}`} />
                        </div>
                      </div>
                      <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                      <span className="text-xs text-primary font-medium">{stat.change}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div 
            ref={(el) => { sectionRefs.current['features-header'] = el; }}
            className={`text-center space-y-4 mb-16 animate-on-scroll slide-in-up ${visibleSections.has('features-header') ? 'visible' : ''}`}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for manufacturing companies
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Material Tracking",
                description: "Track all your materials in real-time with detailed inventory management and automatic alerts."
              },
              {
                icon: Users,
                title: "Partner Network",
                description: "Connect with suppliers and partners seamlessly. Share data and collaborate efficiently."
              },
              {
                icon: Building2,
                title: "Multi-Company Support",
                description: "Manage multiple locations and subsidiaries from a single dashboard."
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                description: "Get insights with powerful analytics and customizable reports for better decisions."
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-level encryption and compliance with industry standards to protect your data."
              },
              {
                icon: Zap,
                title: "Fast Integration",
                description: "Quick setup with existing ERP systems and seamless API integration."
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                ref={(el) => { sectionRefs.current[`feature-${i}`] = el; }}
                className={`group p-6 rounded-2xl bg-card border border-border hover-lift cursor-pointer animate-on-scroll fade-in-scale ${visibleSections.has(`feature-${i}`) ? 'visible' : ''}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="about" className="py-20 px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div 
              ref={(el) => { sectionRefs.current['about-left'] = el; }}
              className={`space-y-6 animate-on-scroll slide-in-left ${visibleSections.has('about-left') ? 'visible' : ''}`}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
                <Target className="w-4 h-4" />
                Our Mission
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Empowering Manufacturers to Build the Future
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Founded in 2024, Waypoint was born from a simple observation: manufacturing supply chains 
                are too complex, too slow, and too expensive. We're changing that by connecting buyers 
                and suppliers on a single, intelligent platform.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our team of industry veterans and technologists have worked at leading manufacturing 
                companies, tech giants, and innovative startups. We understand the challenges you face 
                because we've lived them.
              </p>
              
              <div 
                ref={(el) => { sectionRefs.current['stats'] = el; }}
                className="grid grid-cols-3 gap-6 pt-4"
              >
                {[
                  { value: animatedStats.companies, suffix: "+", label: "Companies", animated: true },
                  { value: animatedStats.materialsTraded, suffix: "B+", prefix: "$", label: "Materials Traded", animated: true },
                  { value: animatedStats.uptime, suffix: "%", label: "Uptime", animated: true },
                ].map((stat, i) => (
                  <div key={i} className="transform transition-all duration-500 hover:scale-105">
                    <p className="text-2xl md:text-3xl font-display font-bold text-primary">
                      {stat.prefix || ''}{stat.animated && typeof stat.value === 'number' ? stat.value : stat.value}{stat.suffix || ''}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Values */}
            <div className="space-y-4">
              {[
                {
                  icon: Target,
                  title: "Precision First",
                  description: "Every feature is designed with accuracy and reliability in mind. Your data integrity is our top priority."
                },
                {
                  icon: Award,
                  title: "Industry Expertise",
                  description: "Built by manufacturing experts who understand the nuances of procurement, inventory, and supply chain management."
                },
                {
                  icon: Globe,
                  title: "Global Scale",
                  description: "Connect with suppliers worldwide. Our platform supports multi-currency, multi-language, and international compliance."
                },
              ].map((value, i) => (
                <div 
                  key={i}
                  ref={(el) => { sectionRefs.current[`value-${i}`] = el; }}
                  className={`flex gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all animate-on-scroll slide-in-right ${visibleSections.has(`value-${i}`) ? 'visible' : ''}`}
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <value.icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-1">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-muted/30 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl float" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div 
            ref={(el) => { sectionRefs.current['contact-header'] = el; }}
            className={`text-center space-y-4 mb-12 animate-on-scroll slide-in-up ${visibleSections.has('contact-header') ? 'visible' : ''}`}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Get in Touch
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact Info */}
            <div 
              ref={(el) => { sectionRefs.current['contact-info'] = el; }}
              className={`lg:col-span-2 space-y-6 animate-on-scroll slide-in-left ${visibleSections.has('contact-info') ? 'visible' : ''}`}
            >
              <div className="p-6 rounded-2xl bg-card border border-border shadow-lg">
                <h3 className="font-display font-semibold text-lg text-foreground mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href="mailto:hello@waypoint.io" className="font-medium text-foreground hover:text-primary transition-colors">
                        hello@waypoint.io
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href="tel:+18005551234" className="font-medium text-foreground hover:text-primary transition-colors">
                        +1 (800) 555-1234
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Office</p>
                      <p className="font-medium text-foreground">
                        100 Innovation Way<br />
                        San Francisco, CA 94107
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-accent/10 border border-accent/20">
                <h3 className="font-display font-semibold text-foreground mb-2">Enterprise Sales</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Looking for custom solutions for your organization? Our enterprise team can help.
                </p>
                <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                  Schedule a Demo
                </Button>
              </div>
            </div>

            {/* Contact Form */}
            <div 
              ref={(el) => { sectionRefs.current['contact-form'] = el; }}
              className={`lg:col-span-3 animate-on-scroll slide-in-right ${visibleSections.has('contact-form') ? 'visible' : ''}`}
            >
              <form onSubmit={handleContactSubmit} className="p-6 rounded-2xl bg-card border border-border shadow-lg">
                <h3 className="font-display font-semibold text-lg text-foreground mb-6">Send us a Message</h3>
                
                {formSubmitted ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="font-display font-semibold text-lg text-foreground mb-2">Message Sent!</h4>
                    <p className="text-muted-foreground">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Name</label>
                        <Input 
                          placeholder="John Smith"
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <Input 
                          type="email"
                          placeholder="john@company.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Company</label>
                      <Input 
                        placeholder="Your company name"
                        value={contactForm.company}
                        onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Message</label>
                      <Textarea 
                        placeholder="How can we help you?"
                        rows={5}
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" variant="hero" className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative">
        <div className="container mx-auto max-w-4xl">
          <div 
            ref={(el) => { sectionRefs.current['cta'] = el; }}
            className={`gradient-hero rounded-3xl p-8 md:p-12 text-center relative overflow-hidden animate-on-scroll fade-in-scale ${visibleSections.has('cta') ? 'visible' : ''}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.05),transparent)]" />
            <div className="relative space-y-6 z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                Ready to Transform Your Operations?
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto">
                Join hundreds of manufacturing companies already using Waypoint to streamline their operations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth">
                  <Button variant="secondary" size="lg" className="font-semibold group hover:scale-105 transition-transform">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="#contact">
                  <Button variant="ghost" size="lg" className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10 group">
                  Contact Sales
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg text-foreground">Waypoint</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The modern platform for manufacturing materials management and procurement.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Waypoint. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

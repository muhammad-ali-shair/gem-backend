import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Trophy, Users } from "lucide-react";

interface FeaturedProject {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl: string;
  category: string;
  totalRaised: string;
  participants: number;
  timeLeft: string;
  status: 'presale' | 'fairlaunch' | 'dutch_auction' | 'completed';
  featured: boolean;
  specialAccolade?: {
    name: string;
    points: number;
    requirement: string;
  };
}

// Featured partner projects - these would normally come from an API
const featuredProjects: FeaturedProject[] = [
  {
    id: "1",
    name: "MetaVerse Protocol",
    symbol: "MVP",
    description: "Revolutionary metaverse infrastructure enabling seamless cross-reality experiences",
    logoUrl: "",
    category: "Metaverse",
    totalRaised: "$2.5M",
    participants: 1247,
    timeLeft: "2 days left",
    status: "presale",
    featured: true,
    specialAccolade: {
      name: "MetaVerse Pioneer",
      points: 1000,
      requirement: "Participate in MVP presale"
    }
  },
  {
    id: "2", 
    name: "DeFi Nexus",
    symbol: "NEXUS",
    description: "Next-generation yield farming protocol with automated portfolio management",
    logoUrl: "",
    category: "DeFi",
    totalRaised: "$1.8M",
    participants: 892,
    timeLeft: "5 days left",
    status: "fairlaunch",
    featured: true,
    specialAccolade: {
      name: "DeFi Innovator",
      points: 750,
      requirement: "Fund NEXUS fair launch"
    }
  },
  {
    id: "3",
    name: "GameFi Arena",
    symbol: "ARENA",
    description: "Play-to-earn gaming ecosystem with NFT marketplace integration",
    logoUrl: "",
    category: "GameFi",
    totalRaised: "$3.2M",
    participants: 2156,
    timeLeft: "1 day left",
    status: "dutch_auction",
    featured: true,
    specialAccolade: {
      name: "Gaming Champion",
      points: 850,
      requirement: "Bid in ARENA auction"
    }
  },
  {
    id: "4",
    name: "Green Energy Token",
    symbol: "GREEN",
    description: "Sustainable blockchain solution for carbon credit trading and environmental impact",
    logoUrl: "",
    category: "Sustainability",
    totalRaised: "$1.4M",
    participants: 634,
    timeLeft: "Completed",
    status: "completed",
    featured: true,
    specialAccolade: {
      name: "Eco Supporter",
      points: 500,
      requirement: "Support GREEN project"
    }
  },
  {
    id: "5",
    name: "AI Analytics Pro",
    symbol: "AAIP",
    description: "Advanced AI-powered trading analytics and market prediction platform",
    logoUrl: "",
    category: "AI/ML",
    totalRaised: "$4.1M",
    participants: 1789,
    timeLeft: "3 days left",
    status: "presale",
    featured: true,
    specialAccolade: {
      name: "AI Early Adopter",
      points: 1200,
      requirement: "Invest in AAIP presale"
    }
  },
  {
    id: "6",
    name: "Social Connect",
    symbol: "SOCIAL",
    description: "Decentralized social media platform with creator monetization and privacy focus",
    logoUrl: "",
    category: "Social",
    totalRaised: "$950K",
    participants: 2847,
    timeLeft: "6 days left",
    status: "fairlaunch",
    featured: true,
    specialAccolade: {
      name: "Social Pioneer",
      points: 600,
      requirement: "Join SOCIAL fair launch"
    }
  }
];

export default function FeaturedProjectsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        return nextIndex >= featuredProjects.length - 2 ? 0 : nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextProject = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      return nextIndex >= featuredProjects.length - 2 ? 0 : nextIndex;
    });
    // Resume auto-play after user interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevProject = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex - 1;
      return nextIndex < 0 ? featuredProjects.length - 3 : nextIndex;
    });
    // Resume auto-play after user interaction
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'presale': return 'bg-blue-600';
      case 'fairlaunch': return 'bg-[#22cda6]';
      case 'dutch_auction': return 'bg-orange-600';
      case 'completed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'presale': return 'Presale';
      case 'fairlaunch': return 'Fair Launch';
      case 'dutch_auction': return 'Dutch Auction';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'presale': return 'bg-blue-600 text-white';
      case 'fairlaunch': return 'bg-[#22cda6] text-black';
      case 'dutch_auction': return 'bg-orange-600 text-white';
      case 'completed': return 'bg-gray-600 text-white';
      default: return 'bg-orange-600 text-white';
    }
  };

  // Show 3 projects at a time
  const visibleProjects = featuredProjects.slice(currentIndex, currentIndex + 3);

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Star className="h-6 w-6 text-[#22cda6] hover:rotate-180 transition-transform duration-700" />
          <h2 className="text-xl font-bold text-white">
            Featured Partner Projects
          </h2>
          <Badge variant="outline" className="text-[#22cda6] border-[#22cda6] hover:bg-[#22cda6]/10 hover:scale-105 transition-all duration-300">
            Exclusive Accolades Available
          </Badge>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevProject}
            className="border-[#22cda6]/30 text-[#22cda6] hover:bg-[#22cda6]/20 hover:border-[#22cda6] hover:shadow-lg hover:shadow-[#22cda6]/30 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextProject}
            className="border-[#22cda6]/30 text-[#22cda6] hover:bg-[#22cda6]/20 hover:border-[#22cda6] hover:shadow-lg hover:shadow-[#22cda6]/30 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
          </Button>
        </div>
      </div>
      {/* Carousel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
        {visibleProjects.map((project, index) => (
          <Card 
            key={`${project.id}-${currentIndex}`} 
            className="bg-[#253935] border-[#22cda6]/20 hover:border-[#22cda6]/60 transition-all duration-500 hover:shadow-xl hover:shadow-[#22cda6]/20 hover:scale-105 transform-gpu group relative overflow-hidden"
            style={{
              animation: `slideInUp 0.6s ease-out ${index * 0.15}s both`,
            }}
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#22cda6]/10 via-transparent to-[#22cda6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Subtle animated border */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#22cda6]/0 via-[#22cda6]/30 to-[#22cda6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <CardContent className="p-6 relative z-10">
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Project Logo Placeholder */}
                  <div className="w-12 h-12 bg-gradient-to-br from-[#22cda6] to-[#1fb898] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg group-hover:shadow-[#22cda6]/40">
                    <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300">
                      {project.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg group-hover:text-[#22cda6] transition-colors duration-300 truncate">{project.name}</h3>
                    <p className="text-[#22cda6] text-sm font-medium group-hover:scale-105 transition-transform duration-300">${project.symbol}</p>
                  </div>
                </div>
                
                <Badge className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80 text-xs text-center flex-shrink-0 ${getStatusBadgeClass(project.status)}`}>
                  {getStatusText(project.status)}
                </Badge>
              </div>

              {/* Project Description */}
              <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Project Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center group-hover:scale-105 transition-transform duration-300">
                  <p className="text-[#22cda6] font-bold text-lg">{project.totalRaised}</p>
                  <p className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">Total Raised</p>
                </div>
                <div className="text-center group-hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-center space-x-1">
                    <Users className="h-4 w-4 text-[#22cda6] group-hover:scale-110 group-hover:text-[#1fb898] transition-all duration-300" />
                    <p className="text-[#22cda6] font-bold text-lg">{project.participants.toLocaleString()}</p>
                  </div>
                  <p className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors duration-300">Participants</p>
                </div>
              </div>

              {/* Special Accolade */}
              {project.specialAccolade && (
                <div className="bg-[#22cda6]/10 border border-[#22cda6]/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Trophy className="h-4 w-4 text-[#22cda6]" />
                    <span className="text-[#22cda6] font-semibold text-sm">
                      {project.specialAccolade.name}
                    </span>
                  </div>
                  <p className="text-white text-xs mb-1">
                    +{project.specialAccolade.points} points
                  </p>
                  <p className="text-gray-400 text-xs">
                    {project.specialAccolade.requirement}
                  </p>
                </div>
              )}

              {/* Time Left & Action */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{project.timeLeft}</span>
                <Button 
                  size="sm" 
                  className="bg-[#22cda6] hover:bg-[#1fb898] text-black font-medium"
                  disabled={project.status === 'completed'}
                >
                  {project.status === 'completed' ? 'Completed' : 'View Project'}
                  {project.status !== 'completed' && <ExternalLink className="h-3 w-3 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Carousel Indicators */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: Math.ceil(featuredProjects.length / 3) }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index * 3)}
            className={`w-2 h-2 rounded-full transition-all ${
              Math.floor(currentIndex / 3) === index
                ? 'bg-[#22cda6] w-6'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
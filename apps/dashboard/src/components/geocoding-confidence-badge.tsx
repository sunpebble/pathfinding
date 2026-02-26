"use client";

import { CheckCircle2, Globe, Map, MapPin, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeocodingConfidenceBadgeProps {
  confidence: number;
  source?: string;
  isManuallyVerified?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GeocodingConfidenceBadge({
  confidence,
  source = "unknown",
  isManuallyVerified = false,
  onClick,
  className,
}: GeocodingConfidenceBadgeProps) {
  // Determine confidence level and colors
  const getConfidenceLevel = () => {
    if (isManuallyVerified) {
      return {
        label: "Manual",
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: CheckCircle2,
      };
    }
    if (confidence >= 0.8) {
      return {
        label: "High",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle2,
      };
    }
    if (confidence >= 0.5) {
      return {
        label: "Medium",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: MapPin,
      };
    }
    return {
      label: "Low",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: MapPin,
    };
  };

  // Get source display name and icon
  const getSourceInfo = () => {
    const sourceMap: Record<string, { name: string; icon: React.ElementType }> =
      {
        amap: { name: "AMap", icon: Map },
        nominatim: { name: "Nominatim", icon: Globe },
        overpass: { name: "OSM", icon: Globe },
        osm: { name: "OSM", icon: Globe },
        manual: { name: "Manual", icon: CheckCircle2 },
        consensus: { name: "Multi-source", icon: CheckCircle2 },
        cache: { name: "Cached", icon: MapPin },
        city_fallback: { name: "City Fallback", icon: MapPin },
      };

    return sourceMap[source.toLowerCase()] || { name: source, icon: MapPin };
  };

  const confidenceLevel = getConfidenceLevel();
  const sourceInfo = getSourceInfo();
  const Icon = confidenceLevel.icon;
  const SourceIcon = sourceInfo.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors",
        confidenceLevel.color,
        onClick && "cursor-pointer hover:opacity-80",
        className,
      )}
      onClick={handleClick}
      title={`${confidenceLevel.label} confidence (${(confidence * 100).toFixed(0)}%) from ${sourceInfo.name}${isManuallyVerified ? " - Manually verified" : ""}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{confidenceLevel.label}</span>
      <span className="text-xs opacity-70">·</span>
      <SourceIcon className="h-3 w-3 opacity-70" />
      <span className="text-xs opacity-70">{sourceInfo.name}</span>
      {onClick && <Pencil className="h-3 w-3 ml-1 opacity-50" />}
    </div>
  );
}

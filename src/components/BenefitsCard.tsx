import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PoseBenefitItem {
  slug: string;
  name?: string;
  benefits?: string[];
  [key: string]: unknown;
}

interface BenefitsCardProps {
  pose?: PoseBenefitItem;
  poseSlug?: string;
  poseLibrary?: PoseBenefitItem[];
}

export const BenefitsCard: React.FC<BenefitsCardProps> = ({ pose, poseSlug, poseLibrary }) => {
  let p = pose;
  if (!p && poseSlug && poseLibrary) {
    p = poseLibrary.find((x) => x.slug === poseSlug);
  }

  const benefits: string[] = p?.benefits || [];

  return (
    <Card className="border-accent/20 shadow-sm p-2.5 sm:p-3 bg-card/70">
      <CardHeader className="p-0 pb-1.5 flex flex-row items-center justify-between border-b border-border/40">
        <CardTitle className="text-xs font-bold text-accent">Health Benefits</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-1.5">
        {benefits.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">Benefits information not available for this pose.</div>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
            {benefits.slice(0, 3).map((b, i) => (
              <li key={i} className="font-medium text-[11px] sm:text-xs leading-snug">{b}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BenefitsCard;

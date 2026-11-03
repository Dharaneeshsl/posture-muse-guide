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
    <Card className="border-accent/20 shadow-sm">
      <CardHeader>
        <CardTitle className="font-semibold text-accent">Health Benefits</CardTitle>
      </CardHeader>
      <CardContent>
        {benefits.length === 0 ? (
          <div className="text-base text-muted-foreground">Benefits information not available for this pose.</div>
        ) : (
          <ul className="list-disc list-inside space-y-3 text-base text-foreground">
            {benefits.map((b, i) => (
              <li key={i} className="font-medium text-base">{b}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BenefitsCard;

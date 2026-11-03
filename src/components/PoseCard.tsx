import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PoseCardProps {
  slug: string;
  name: string;
  difficulty: string;
  thumbnail: string;
  short: string;
  onSelect: () => void;
}

export function PoseCard({ name, difficulty, thumbnail, short, onSelect }: PoseCardProps) {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-success/10 text-success hover:bg-success/20";
      case "intermediate":
        return "bg-warning/10 text-warning hover:bg-warning/20";
      case "advanced":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={thumbnail}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{name}</CardTitle>
          <Badge variant="secondary" className={getDifficultyColor(difficulty)}>
            {difficulty}
          </Badge>
        </div>
        <CardDescription className="text-sm mt-2">{short}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onSelect} className="w-full" variant="default">
          Practice
        </Button>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Award, Zap } from 'lucide-react';

// Define the badge types
type BadgeType = 'smart-spender' | 'top-saver' | 'efficiency-expert';

// Define the badge props
interface BadgeProps {
  type: BadgeType;
  score: number;
}

// Define the component props
interface GroupBadgesProps {
  badges: BadgeProps[];
}

export const GroupBadges: React.FC<GroupBadgesProps> = ({ badges }) => {
  // Function to get badge details based on type
  const getBadgeDetails = (type: BadgeType) => {
    switch (type) {
      case 'smart-spender':
        return {
          icon: <Star className="h-6 w-6 text-yellow-500" />,
          title: 'Smart Spender',
          description: 'You consistently make wise spending decisions',
          color: 'bg-yellow-100 border-yellow-300'
        };
      case 'top-saver':
        return {
          icon: <Award className="h-6 w-6 text-blue-500" />,
          title: 'Top Saver',
          description: 'You excel at saving money each month',
          color: 'bg-blue-100 border-blue-300'
        };
      case 'efficiency-expert':
        return {
          icon: <Zap className="h-6 w-6 text-purple-500" />,
          title: 'Efficiency Expert',
          description: 'You optimize your spending for maximum value',
          color: 'bg-purple-100 border-purple-300'
        };
      default:
        return {
          icon: <Star className="h-6 w-6 text-gray-500" />,
          title: 'Unknown Badge',
          description: 'Badge details not available',
          color: 'bg-gray-100 border-gray-300'
        };
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {badges.map((badge, index) => {
        const details = getBadgeDetails(badge.type);
        
        return (
          <Card key={index} className={`p-4 border-2 ${details.color}`}>
            <div className="flex items-center mb-3">
              {details.icon}
              <div className="ml-3">
                <h3 className="font-semibold">{details.title}</h3>
                <Badge variant="outline" className="mt-1">Score: {badge.score}/100</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{details.description}</p>
            <Progress value={badge.score} className="h-2" />
          </Card>
        );
      })}
    </div>
  );
};
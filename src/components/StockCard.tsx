
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  prediction?: number;
  volume?: number;
  className?: string;
}

const StockCard = ({ 
  symbol, 
  name, 
  price, 
  change, 
  changePercent, 
  prediction,
  volume,
  className 
}: StockCardProps) => {
  const isPositive = change >= 0;
  const predictionChange = prediction ? ((prediction - price) / price) * 100 : 0;
  const isPredictionPositive = predictionChange >= 0;

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200 animate-fade-in", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">{symbol}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{name}</p>
          </div>
          <Badge 
            variant={isPositive ? "default" : "destructive"} 
            className="flex items-center gap-1"
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {changePercent.toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${price.toFixed(2)}</span>
          <span className={cn(
            "text-sm font-medium",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? '+' : ''}${change.toFixed(2)}
          </span>
        </div>
        
        {prediction && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Prediction:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">${prediction.toFixed(2)}</span>
                <span className={cn(
                  "text-xs",
                  isPredictionPositive ? "text-green-600" : "text-red-600"
                )}>
                  ({isPredictionPositive ? '+' : ''}{predictionChange.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
        
        {volume && (
          <div className="text-xs text-muted-foreground">
            Volume: {(volume / 1000000).toFixed(1)}M
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockCard;

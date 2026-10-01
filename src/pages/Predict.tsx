
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import { Search, TrendingUp, TrendingDown, Brain, Target, Zap } from 'lucide-react';
import { useStockData } from '@/hooks/useStockData';
import { useStockPrediction } from '@/hooks/useStockPrediction';
import { toast } from 'sonner';

interface ChartPoint {
  time: string;
  price: number;
  volume: number;
}

interface StockInfo {
  symbol: string;
  price: number;
  name: string;
  change: number;
  changePercent: number;
  volume?: number;
}

const Predict = () => {
  const [searchSymbol, setSearchSymbol] = useState('AAPL');
  const [currentStock, setCurrentStock] = useState<StockInfo | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [prediction, setPrediction] = useState<{ predictedPrice: number; confidence: number; reasoning?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { fetchStockPrice, fetchStockChart, loading: stockLoading } = useStockData();
  const { generatePrediction, getCachedPrediction, loading: predictionLoading } = useStockPrediction();

  const analyzeSymbol = async (symbol: string) => {
    if (!symbol.trim()) {
      toast.error('Please enter a stock symbol');
      return;
    }

    setIsAnalyzing(true);

    try {
      const cached = await getCachedPrediction(symbol.toUpperCase());
      const stockData = await fetchStockPrice(symbol.toUpperCase());
      const chartHistory = await fetchStockChart(symbol.toUpperCase());

      if (stockData) {
        setCurrentStock(stockData);

        const transformedChart = chartHistory.map(point => ({
          time: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: point.price,
          volume: point.volume,
        }));
        setChartData(transformedChart);

        let predictionResult = cached;
        if (!cached) {
          const historicalPrices = chartHistory.map(point => point.price);
          predictionResult = await generatePrediction(
            symbol.toUpperCase(),
            stockData.price,
            historicalPrices
          );
        }

        setPrediction(predictionResult);
        toast.success(`Analysis complete for ${symbol.toUpperCase()}`);
      } else {
        toast.error('Failed to fetch stock data');
      }
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = () => analyzeSymbol(searchSymbol);

  useEffect(() => {
    analyzeSymbol('AAPL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META'];
  const isLoading = stockLoading || predictionLoading || isAnalyzing;
  
  const predictionChange = prediction && currentStock ? 
    ((prediction.predictedPrice - currentStock.price) / currentStock.price) * 100 : 0;
  const isPredictionPositive = predictionChange >= 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">AI Stock Prediction</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get real-time stock data and AI-powered price predictions using advanced machine learning algorithms.
        </p>
      </div>

      {/* Search Section */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Analyze Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL)"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              className="uppercase"
            />
            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          
          {/* Quick Access Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2">Quick access:</span>
            {quickSymbols.map(symbol => (
              <Button
                key={symbol}
                variant="outline"
                size="sm"
                onClick={() => {
                    setSearchSymbol(symbol);
                    analyzeSymbol(symbol);
                  }}
                className="text-xs"
              >
                {symbol}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {currentStock && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <StockCard {...currentStock} />
          </div>
          
          {/* Prediction Summary */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Prediction Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prediction ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-accent/20 rounded-lg">
                        <div className="text-sm text-muted-foreground">Predicted Price</div>
                        <div className="text-2xl font-bold">${prediction.predictedPrice.toFixed(2)}</div>
                        <Badge variant={isPredictionPositive ? "default" : "destructive"} className="mt-2">
                          {isPredictionPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {isPredictionPositive ? '+' : ''}{predictionChange.toFixed(2)}%
                        </Badge>
                      </div>
                      
                      <div className="text-center p-4 bg-accent/20 rounded-lg">
                        <div className="text-sm text-muted-foreground">Confidence Level</div>
                        <div className="text-2xl font-bold">{prediction.confidence}%</div>
                        <Badge variant="outline" className="mt-2">
                          <Target className="h-3 w-3 mr-1" />
                          {prediction.confidence >= 80 ? 'High' : prediction.confidence >= 60 ? 'Medium' : 'Low'} Confidence
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                       <p>
                         <strong>Analysis:</strong>{' '}
                         {prediction.reasoning
                           ? prediction.reasoning
                           : `Our AI model analyzed historical price movements, volatility patterns, and technical indicators to predict a ${isPredictionPositive ? 'bullish' : 'bearish'} trend for ${currentStock.symbol}.`}
                       </p>
                     </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Search for a stock to see AI predictions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="animate-slide-up">
          <StockChart 
            data={chartData}
            symbol={currentStock?.symbol || ''}
            showPrediction={false}
            type="line"
          />
        </div>
      )}

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/10">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="text-sm text-muted-foreground">
              <strong>Disclaimer:</strong> Stock predictions are for educational purposes only and should not be considered as financial advice. 
              Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Predict;

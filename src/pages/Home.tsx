
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import { useAuth } from '@/contexts/AuthContext';
import { useStockData } from '@/hooks/useStockData';
import { TrendingUp, TrendingDown, Activity, Users, ArrowRight, Brain, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChartPoint {
  time: string;
  price: number;
  volume: number;
}

interface StockData {
  symbol: string;
  price: number;
  changePercent: number;
  change: number;
  name: string;
  volume?: number;
}

const Home = () => {
  const { user } = useAuth();
  const { fetchMarketOverview, fetchStockChart, loading } = useStockData();
  const [marketData, setMarketData] = useState<StockData[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META'];
        const data = await fetchMarketOverview(symbols);
        const validData = data.filter(stock => stock !== null);
        setMarketData(validData);

        if (validData.length === 0) {
          console.warn('No valid stock data found. Check API connectivity.');
          return;
        }

        // Load chart data for first available stock
        const firstSymbol = validData[0]?.symbol || 'AAPL';
        const chartResult = await fetchStockChart(firstSymbol);
        
        if (chartResult.length > 0) {
          const transformedChart = chartResult.map(point => ({
            time: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: point.price,
            volume: point.volume,
          }));
          setChartData(transformedChart);
        }
      } catch (error) {
        console.error('Failed to load market data:', error);
      }
    };

    loadMarketData();
  }, [fetchMarketOverview, fetchStockChart]);

  const marketStats = {
    totalValue: marketData.reduce((sum, stock) => sum + (stock.price * 1000000), 0),
    gainers: marketData.filter(stock => stock.changePercent > 0).length,
    losers: marketData.filter(stock => stock.changePercent < 0).length,
    avgChange: marketData.length > 0 ? 
      marketData.reduce((sum, stock) => sum + stock.changePercent, 0) / marketData.length : 0,
  };

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Investor';

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get real-time market insights and AI-powered stock predictions to make informed investment decisions.
        </p>
      </div>

      {/* Market Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        

        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gainers</p>
                <p className="text-2xl font-bold">{marketStats.gainers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Losers</p>
                <p className="text-2xl font-bold">{marketStats.losers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Change</p>
                <div className="text-2xl font-bold">
                  <Badge variant={marketStats.avgChange >= 0 ? "default" : "destructive"}>
                    {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Stock Prediction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use our advanced AI algorithms to predict future stock prices with high accuracy.
            </p>
            <Link to="/predict">
              <Button className="w-full">
                <Zap className="mr-2 h-4 w-4" />
                Start Predicting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Compare Stocks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compare multiple stocks side by side to make informed investment decisions.
            </p>
            <Link to="/compare">
              <Button variant="outline" className="w-full">
                Compare Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Benefits */}
      <Card className="animate-fade-in bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Real-Time Data with Authentication</h3>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {user ? (
                "You're logged in and accessing real-time stock data via Yahoo Finance. All prices are live and updated every request."
              ) : (
                "Sign up to access premium features including real-time data, personalized watchlists, and advanced AI predictions with higher accuracy."
              )}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AI predictions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Market insights</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Chart */}
      {chartData.length > 0 && (
        <div className="animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Featured: Apple Inc. (AAPL)</CardTitle>
            </CardHeader>
            <CardContent>
              <StockChart
                data={chartData}
                symbol="AAPL"
                showPrediction={false}
                type="area"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Stocks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Top Stocks</h2>
          <Link to="/predict">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketData.slice(0, 6).map((stock, index) => (
              <div 
                key={stock.symbol} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <StockCard {...stock} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

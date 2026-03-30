import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useMarket } from '../context/MarketContext';
import { useHeroes } from '../context/HeroesContext';
import { useEconomy } from '../context/EconomyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ShoppingBag, Coins, Tag, X, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { CARD_LIBRARY } from '../lib/mockData';
import { toast } from 'sonner';

export default function MarketPage() {
  const { identity } = useInternetIdentity();
  const { npcOffers, listings, buyFromNpc, listHeroForSale, buyListing, cancelListing } = useMarket();
  const { heroes } = useHeroes();
  const { getMythexBalance, canAffordMythex } = useEconomy();
  const [selectedHeroId, setSelectedHeroId] = useState<string>('');
  const [listingPrice, setListingPrice] = useState<number>(100);

  const balance = getMythexBalance();

  if (!identity) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to access the market.</p>
      </div>
    );
  }

  const handleBuyNpc = (offerId: string) => {
    const offer = npcOffers.find(o => o.id === offerId);
    if (!offer) {
      toast.error('Offer not found');
      return;
    }

    if (!canAffordMythex(offer.price)) {
      toast.error(`Insufficient Mythex! You need ${offer.price} Mythex but only have ${balance}.`);
      return;
    }

    const success = buyFromNpc(offerId);
    if (success) {
      const cardData = CARD_LIBRARY.find(c => c.id === offer.cardId);
      toast.success(`Successfully purchased ${cardData?.name || 'hero'}!`);
    } else {
      toast.error('Purchase failed. Please try again.');
    }
  };

  const handleListHero = () => {
    if (!selectedHeroId || listingPrice <= 0) {
      toast.error('Please select a hero and set a valid price.');
      return;
    }
    const success = listHeroForSale(selectedHeroId, listingPrice);
    if (success) {
      toast.success('Hero listed for sale!');
      setSelectedHeroId('');
      setListingPrice(100);
    } else {
      toast.error('Failed to list hero. Hero may already be listed.');
    }
  };

  const handleBuyListing = (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
      toast.error('Listing not found');
      return;
    }

    if (!canAffordMythex(listing.price)) {
      toast.error(`Insufficient Mythex! You need ${listing.price} Mythex but only have ${balance}.`);
      return;
    }

    const success = buyListing(listingId);
    if (success) {
      toast.success('Hero purchased successfully!');
    } else {
      toast.error('Purchase failed. Please try again.');
    }
  };

  const handleCancelListing = (listingId: string) => {
    const success = cancelListing(listingId);
    if (success) {
      toast.success('Listing cancelled successfully!');
    } else {
      toast.error('Failed to cancel listing.');
    }
  };

  const eligibleHeroes = heroes.filter(h => !h.marketLocked);
  const myActiveListings = listings.filter(l => l.status === 'active' && l.seller === 'local-player');

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">Market</h1>
        <p className="text-xl text-amber-200/80">
          Buy heroes from the NPC Guild or trade with other players. Build your collection and strengthen your bands.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-amber-600/30 rounded-lg p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-amber-300 font-semibold">Your Mythex:</span>
          <div className="flex items-center gap-2 text-amber-200">
            <Coins className="w-5 h-5" />
            <span className="text-2xl font-bold">{balance}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="npc" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-900/60 border border-amber-600/30">
          <TabsTrigger
            value="npc"
            className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300"
          >
            NPC Guild Market
          </TabsTrigger>
          <TabsTrigger
            value="listings"
            className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300"
          >
            Your Listings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="npc" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {npcOffers.map(offer => {
              const cardData = CARD_LIBRARY.find(c => c.id === offer.cardId);
              if (!cardData) return null;

              const canAfford = canAffordMythex(offer.price);

              return (
                <Card
                  key={offer.id}
                  className="bg-gradient-to-b from-amber-900/80 to-amber-950/90 border-2 border-amber-600/50 hover:border-amber-400/70 transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-amber-300">{cardData.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                        {cardData.class}
                      </Badge>
                      <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                        {cardData.rarity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-amber-200/70">{cardData.description}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Coins className="w-5 h-5" />
                        <span className="text-xl font-bold">{offer.price}</span>
                      </div>
                      <div className="text-sm text-amber-300/70">Stock: {offer.stock}</div>
                    </div>
                    {!canAfford && (
                      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>Insufficient Mythex</span>
                      </div>
                    )}
                    <Button
                      onClick={() => handleBuyNpc(offer.id)}
                      disabled={!canAfford}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Purchase
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="listings" className="mt-6 space-y-6">
          {/* Create Listing */}
          <Card className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 border-2 border-amber-600/50">
            <CardHeader>
              <CardTitle className="text-amber-300 flex items-center gap-2">
                <Tag className="w-6 h-6" />
                List Hero for Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="text-amber-300 font-semibold">Select Hero:</label>
                <Select value={selectedHeroId} onValueChange={setSelectedHeroId}>
                  <SelectTrigger className="bg-slate-900/70 border-amber-600/40 text-amber-200">
                    <SelectValue placeholder="Choose a hero to sell..." />
                  </SelectTrigger>
                  <SelectContent className="bg-amber-950 border-amber-600/50 max-h-64">
                    {eligibleHeroes.map(hero => (
                      <SelectItem
                        key={hero.instanceId}
                        value={hero.instanceId}
                        className="text-amber-200 focus:bg-amber-600/20 focus:text-amber-300"
                      >
                        {hero.name} (Lv.{hero.level}, Tier {hero.forgeTier || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-amber-300 font-semibold">Price (Mythex):</label>
                <Input
                  type="number"
                  min="1"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-slate-900/70 border-amber-600/40 text-amber-200"
                />
              </div>

              <Button
                onClick={handleListHero}
                disabled={!selectedHeroId || listingPrice <= 0}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Tag className="w-4 h-4 mr-2" />
                List for Sale
              </Button>
            </CardContent>
          </Card>

          {/* Active Listings */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-amber-400">Your Active Listings</h3>
            {myActiveListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myActiveListings.map(listing => {
                  const hero = heroes.find(h => h.instanceId === listing.heroInstanceId);
                  if (!hero) return null;

                  return (
                    <Card
                      key={listing.id}
                      className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 border-2 border-amber-600/50"
                    >
                      <CardHeader>
                        <CardTitle className="text-amber-300">{hero.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                            Lv.{hero.level}
                          </Badge>
                          <Badge variant="outline" className="border-amber-600/50 text-amber-300">
                            Tier {hero.forgeTier || 0}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Coins className="w-5 h-5" />
                          <span className="text-2xl font-bold">{listing.price}</span>
                        </div>
                        <Button
                          onClick={() => handleCancelListing(listing.id)}
                          variant="outline"
                          className="w-full border-red-600/40 text-red-400 hover:bg-red-600/20"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Listing
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-800/60 border-amber-500/30 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <Tag className="w-12 h-12 text-amber-400 mx-auto mb-4 opacity-50" />
                  <p className="text-amber-200/70">No active listings. List a hero to start selling!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

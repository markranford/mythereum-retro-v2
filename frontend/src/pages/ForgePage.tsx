import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Hammer } from 'lucide-react';
import FusePanel from '../components/forge/FusePanel';
import RefinePanel from '../components/forge/RefinePanel';

export default function ForgePage() {
  const { identity } = useInternetIdentity();

  if (!identity) {
    return (
      <div className="text-center py-12">
        <Hammer className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Login Required</h2>
        <p className="text-amber-200/70">Please login to access the forge.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-amber-400">The Forge</h1>
        <p className="text-xl text-amber-200/80">
          Enhance your heroes through fusion and refinement. Combine duplicates to increase forge tiers or spend Soft Mythex to directly boost experience.
        </p>
      </div>

      <Tabs defaultValue="fusion" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-900/60 border border-amber-600/30">
          <TabsTrigger
            value="fusion"
            className="data-[state=active]:bg-amber-600/30 data-[state=active]:text-amber-300"
          >
            Fusion
          </TabsTrigger>
          <TabsTrigger
            value="refinement"
            className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300"
          >
            Refinement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fusion" className="mt-6">
          <FusePanel />
        </TabsContent>

        <TabsContent value="refinement" className="mt-6">
          <RefinePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

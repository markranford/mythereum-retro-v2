import React, { useState } from 'react';
import { BuildingInstance, BuildingTemplate } from '../../types/strongholds';
import { BUILDING_TEMPLATES } from '../../lib/strongholdMockData';
import { getPosition, getZoneFromIndex, TOTAL_POSITIONS } from '../../lib/hexMath';
import HexTile from './HexTile';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Move, Plus, Info } from 'lucide-react';

type MapMode = 'view' | 'build' | 'manage' | 'move';

interface StrongholdMapProps {
  buildings: Record<string, BuildingInstance>;
  onBuildingPlace?: (templateId: string, positionIndex: number) => void;
  onBuildingMove?: (buildingId: string, newPositionIndex: number) => void;
  onBuildingSelect?: (buildingId: string) => void;
}

export default function StrongholdMap({
  buildings,
  onBuildingPlace,
  onBuildingMove,
  onBuildingSelect,
}: StrongholdMapProps) {
  const [mode, setMode] = useState<MapMode>('view');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoBuilding, setInfoBuilding] = useState<{ id: string; building: BuildingInstance; template: BuildingTemplate } | null>(null);

  // Get occupied positions
  const occupiedPositions = new Set(
    Object.values(buildings).map(b => b.positionIndex)
  );

  // Get valid move targets for selected building
  const getValidMoveTargets = (buildingId: string): Set<number> => {
    const building = buildings[buildingId];
    if (!building) return new Set();

    const template = BUILDING_TEMPLATES[building.templateId];
    const validTargets = new Set<number>();

    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      if (occupiedPositions.has(i) && i !== building.positionIndex) continue;
      const zone = getZoneFromIndex(i);
      if (template.allowedZones.includes(zone)) {
        validTargets.add(i);
      }
    }

    return validTargets;
  };

  const validMoveTargets = selectedBuildingId ? getValidMoveTargets(selectedBuildingId) : new Set<number>();

  // Get valid build positions for selected template
  const getValidBuildPositions = (templateId: string): Set<number> => {
    const template = BUILDING_TEMPLATES[templateId];
    if (!template) return new Set();

    const validPositions = new Set<number>();
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      if (occupiedPositions.has(i)) continue;
      const zone = getZoneFromIndex(i);
      if (template.allowedZones.includes(zone)) {
        validPositions.add(i);
      }
    }

    return validPositions;
  };

  const validBuildPositions = selectedTemplateId ? getValidBuildPositions(selectedTemplateId) : new Set<number>();

  const handleTileClick = (positionIndex: number) => {
    // Find building at this position
    const buildingEntry = Object.entries(buildings).find(
      ([_, b]) => b.positionIndex === positionIndex
    );

    if (mode === 'view') {
      if (buildingEntry) {
        const [buildingId, building] = buildingEntry;
        const template = BUILDING_TEMPLATES[building.templateId];
        setInfoBuilding({ id: buildingId, building, template });
        setShowInfoDialog(true);
        onBuildingSelect?.(buildingId);
      }
    } else if (mode === 'move' && selectedBuildingId) {
      if (validMoveTargets.has(positionIndex)) {
        onBuildingMove?.(selectedBuildingId, positionIndex);
        setSelectedBuildingId(null);
        setMode('view');
      }
    } else if (mode === 'build' && selectedTemplateId) {
      if (validBuildPositions.has(positionIndex)) {
        onBuildingPlace?.(selectedTemplateId, positionIndex);
        setSelectedTemplateId(null);
        setMode('view');
      }
    } else if (mode === 'manage' && buildingEntry) {
      const [buildingId] = buildingEntry;
      setSelectedBuildingId(buildingId);
      setMode('move');
    }
  };

  const startBuildMode = () => {
    setShowBuildDialog(true);
  };

  const confirmBuildSelection = () => {
    if (selectedTemplateId) {
      setMode('build');
      setShowBuildDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Controls */}
      <div className="flex gap-2 justify-center">
        <Button
          onClick={() => setMode('view')}
          variant={mode === 'view' ? 'default' : 'outline'}
          size="sm"
          className={mode === 'view' ? 'bg-retro-goldGlow text-retro-shadow hover:bg-retro-moltenGold border-retro-moltenGold' : 'border-retro-goldGlow/40 text-retro-goldGlow hover:bg-retro-goldGlow/10'}
        >
          <Info className="w-4 h-4 mr-1" />
          View
        </Button>
        <Button
          onClick={startBuildMode}
          variant={mode === 'build' ? 'default' : 'outline'}
          size="sm"
          className={mode === 'build' ? 'bg-retro-goldGlow text-retro-shadow hover:bg-retro-moltenGold border-retro-moltenGold' : 'border-retro-goldGlow/40 text-retro-goldGlow hover:bg-retro-goldGlow/10'}
        >
          <Plus className="w-4 h-4 mr-1" />
          Build
        </Button>
        <Button
          onClick={() => setMode('manage')}
          variant={mode === 'manage' || mode === 'move' ? 'default' : 'outline'}
          size="sm"
          className={mode === 'manage' || mode === 'move' ? 'bg-retro-goldGlow text-retro-shadow hover:bg-retro-moltenGold border-retro-moltenGold' : 'border-retro-goldGlow/40 text-retro-goldGlow hover:bg-retro-goldGlow/10'}
        >
          <Move className="w-4 h-4 mr-1" />
          Move
        </Button>
      </div>

      {/* Status Text */}
      <div className="text-center text-sm text-retro-goldGlow/90 font-semibold drop-shadow-md">
        {mode === 'view' && 'Click a building to view details'}
        {mode === 'build' && selectedTemplateId && 'Click a highlighted hex to place building'}
        {mode === 'manage' && 'Click a building to move it'}
        {mode === 'move' && selectedBuildingId && 'Click a highlighted hex to move building'}
      </div>

      {/* Hex Map Container with Painterly Medieval Fantasy Background */}
      <div className="relative mx-auto rounded-lg overflow-hidden shadow-2xl border-4 border-retro-moltenGold/30"
        style={{ width: '800px', height: '800px' }}
      >
        {/* Medieval fantasy fortress map background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/assets/generated/fortress-map-background.dim_800x800.png')",
            filter: 'brightness(0.7) contrast(1.1)',
          }}
        />
        
        {/* Vignette overlay for depth */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(45, 24, 16, 0.3) 60%, rgba(22, 12, 7, 0.8) 100%)',
          }}
        />

        {/* Hex grid overlay */}
        <div className="absolute inset-0">
          {/* Render all hex positions */}
          {Array.from({ length: TOTAL_POSITIONS }).map((_, index) => {
            const position = getPosition(index);
            const buildingEntry = Object.entries(buildings).find(
              ([_, b]) => b.positionIndex === index
            );
            const [buildingId, building] = buildingEntry || [null, null];
            const template = building ? BUILDING_TEMPLATES[building.templateId] : undefined;

            const isSelected = buildingId === selectedBuildingId;
            const isMoveTarget = mode === 'move' && validMoveTargets.has(index);
            const isBuildTarget = mode === 'build' && validBuildPositions.has(index);
            const isEmpty = !building;

            return (
              <HexTile
                key={index}
                positionIndex={index}
                zone={position.zone}
                building={building || undefined}
                template={template}
                isSelected={isSelected}
                isMoveTarget={isMoveTarget || isBuildTarget}
                isEmpty={isEmpty}
                onClick={() => handleTileClick(index)}
                x={position.x}
                y={position.y}
              />
            );
          })}
        </div>
      </div>

      {/* Build Dialog */}
      <Dialog open={showBuildDialog} onOpenChange={setShowBuildDialog}>
        <DialogContent className="bg-retro-deepBrown border-2 border-retro-goldGlow/50">
          <DialogHeader>
            <DialogTitle className="text-retro-goldGlow text-xl font-bold">Select Building to Construct</DialogTitle>
            <DialogDescription className="text-amber-200/80">
              Choose a building type to place on your stronghold map
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="bg-retro-shadow/70 border-retro-goldGlow/40 text-amber-200">
                <SelectValue placeholder="Select building type..." />
              </SelectTrigger>
              <SelectContent className="bg-retro-deepBrown border-retro-goldGlow/50">
                {Object.values(BUILDING_TEMPLATES).map(template => (
                  <SelectItem key={template.id} value={template.id} className="text-amber-200 focus:bg-retro-goldGlow/20 focus:text-retro-goldGlow">
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <div className="text-sm text-amber-200/90 bg-retro-shadow/50 p-4 rounded border border-retro-goldGlow/30">
                <div className="font-bold text-retro-goldGlow mb-2 text-base">
                  {BUILDING_TEMPLATES[selectedTemplateId].name}
                </div>
                <div className="text-xs mb-3 text-amber-100/80">{BUILDING_TEMPLATES[selectedTemplateId].description}</div>
                <div className="text-xs text-retro-goldGlow/80 font-semibold">
                  Allowed zones: {BUILDING_TEMPLATES[selectedTemplateId].allowedZones.join(', ')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowBuildDialog(false);
                setSelectedTemplateId(null);
              }}
              variant="outline"
              className="border-retro-goldGlow/40 text-amber-200 hover:bg-retro-goldGlow/10"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBuildSelection}
              disabled={!selectedTemplateId}
              className="bg-retro-goldGlow text-retro-shadow hover:bg-retro-moltenGold border-retro-moltenGold font-bold"
            >
              Select Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="bg-retro-deepBrown border-2 border-retro-goldGlow/50">
          <DialogHeader>
            <DialogTitle className="text-retro-goldGlow text-xl font-bold">
              {infoBuilding?.template.name} - Level {infoBuilding?.building.level}
            </DialogTitle>
            <DialogDescription className="text-amber-200/80">
              {infoBuilding?.template.description}
            </DialogDescription>
          </DialogHeader>
          {infoBuilding && (
            <div className="space-y-3 text-sm text-amber-200/90">
              <div>
                <span className="text-retro-goldGlow font-bold">Category:</span> {infoBuilding.template.category}
              </div>
              <div>
                <span className="text-retro-goldGlow font-bold">Position:</span> {getZoneFromIndex(infoBuilding.building.positionIndex)} zone
              </div>
              {infoBuilding.template.baseProduction && (
                <div>
                  <span className="text-retro-goldGlow font-bold">Production per hour:</span>
                  <div className="text-xs mt-1 space-y-1">
                    {Object.entries(infoBuilding.template.baseProduction).map(([resource, amount]) => (
                      amount && <div key={resource} className="text-amber-100/80">{resource}: +{amount * infoBuilding.building.level}</div>
                    ))}
                  </div>
                </div>
              )}
              {infoBuilding.building.upgrading && (
                <div className="text-blue-400 font-bold">
                  ⏳ Upgrading to level {infoBuilding.building.level + 1}...
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setShowInfoDialog(false)}
              className="bg-retro-goldGlow text-retro-shadow hover:bg-retro-moltenGold border-retro-moltenGold font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

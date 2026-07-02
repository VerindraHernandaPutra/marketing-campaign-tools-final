import { createContext, useContext } from 'react';
import { Canvas, Object as FabricObject } from 'fabric';

export interface CanvasContextType {
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const useFabricCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useFabricCanvas must be used within a CanvasProvider');
  }
  return context;
};

import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Object as FabricObject, Rect } from 'fabric';
import { Box, useMantineTheme, useMantineColorScheme } from '@mantine/core';

interface CanvasProps {
  setCanvas: (canvas: FabricCanvas | null) => void;
  setSelectedObject: (obj: FabricObject | null) => void;
  projectData: string | null;
  width: number;
  height: number;
  onDataLoaded?: () => void;
  onContainerResize?: (w: number, h: number) => void;
  viewport?: { zoom: number; panX: number; panY: number };
}

const Canvas: React.FC<CanvasProps> = ({
  setCanvas,
  setSelectedObject,
  projectData,
  onDataLoaded,
  onContainerResize,
  width,
  height,
  viewport,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const localCanvasRef = useRef<FabricCanvas | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const onDataLoadedRef = useRef(onDataLoaded);
  const onContainerResizeRef = useRef(onContainerResize);
  useEffect(() => {
    onDataLoadedRef.current = onDataLoaded;
    onContainerResizeRef.current = onContainerResize;
  });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
    });

    canvas.clipPath = new Rect({
      left: 0,
      top: 0,
      width: width,
      height: height,
      originX: 'left',
      originY: 'top',
      absolutePositioned: false,
    });

    const handleSelection = (e: { selected?: FabricObject[] }) => {
      setSelectedObject(e.selected && e.selected.length > 0 ? e.selected[0] : null);
    };
    const handleCleared = () => setSelectedObject(null);

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);

    setCanvas(canvas);
    localCanvasRef.current = canvas;
    setIsCanvasReady(true);
    canvas.requestRenderAll();

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleCleared);
      try {
        canvas.dispose();
      } catch {
        console.warn('Canvas dispose skipped.');
      }
      setCanvas(null);
      localCanvasRef.current = null;
      setIsCanvasReady(false);
      setSelectedObject(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = localCanvasRef.current;
    if (!c) return;
    c.clipPath = new Rect({
      left: 0, top: 0, width, height,
      originX: 'left', originY: 'top', absolutePositioned: false,
    });
    c.requestRenderAll();
  }, [isCanvasReady, width, height]);

  useEffect(() => {
    const c = localCanvasRef.current;
    if (!c || !containerRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastWidth = 0;
    let lastHeight = 0;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w <= 0 || h <= 0) return;
        if (w === lastWidth && h === lastHeight) return;
        lastWidth = w;
        lastHeight = h;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const canvas = localCanvasRef.current;
          if (canvas) {
            canvas.setDimensions({ width: w, height: h });
            canvas.requestRenderAll();
          }
          onContainerResizeRef.current?.(w, h);
        }, 100);
      }
    });

    observer.observe(containerRef.current);
    return () => { observer.disconnect(); clearTimeout(timeoutId); };
  }, [isCanvasReady]);

  useEffect(() => {
    const c = localCanvasRef.current;
    if (!c) return;
    if (!projectData) {
      c.backgroundColor = '';
      c.requestRenderAll();
      return;
    }
    const loadData = async () => {
      try {
        const json = typeof projectData === 'string' ? JSON.parse(projectData) : projectData;
        await c.loadFromJSON(json);
        c.backgroundColor = '';
        c.requestRenderAll();
        onDataLoadedRef.current?.();
      } catch (err) {
        console.error('Error loading canvas data:', err);
      }
    };
    loadData();
  }, [isCanvasReady, projectData]);

  useEffect(() => {
    if (!isCanvasReady) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const canvas = localCanvasRef.current;
      if (!canvas) return;
      const activeObj = canvas.getActiveObject() as FabricObject & { isEditing?: boolean };
      if (!activeObj || activeObj.isEditing) return;
      canvas.remove(activeObj);
      canvas.renderAll();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCanvasReady]);

  const gray = colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1];

  const pageStyle: React.CSSProperties = viewport
    ? {
        position: 'absolute',
        left: viewport.panX,
        top: viewport.panY,
        width: width * viewport.zoom,
        height: height * viewport.zoom,
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.16)',
        pointerEvents: 'none',
      }
    : { display: 'none' };

  return (
    <Box
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        height: '100%',
        width: '100%',
        backgroundColor: gray,
        overflow: 'hidden',
      }}
    >
      <div style={pageStyle} />
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
    </Box>
  );
};

export default Canvas;

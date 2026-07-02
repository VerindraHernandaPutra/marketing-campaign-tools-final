import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@mantine/core';
import EditorHeader from './EditorHeader';
import EditorSidebar from './EditorSidebar';
import CanvasComponent from './Canvas';
import PropertiesPanel from './PropertiesPanel';
import ResizeModal from './ResizeModal';
import DownloadModal from './DownloadModal';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Canvas, Object as FabricObject, Point, Rect } from 'fabric';
import { jsPDF } from 'jspdf';
import { useQueryClient } from '@tanstack/react-query';
import { CanvasContext } from './CanvasContext';
import type { CanvasContextType } from './CanvasContext';
import { useNotification } from '../notifications/NotificationContext';

type LoadedCanvasData = {
  width?: number;
  height?: number;
  [key: string]: unknown;
};

const CanvaEditor: React.FC = () => {
  const [zoom, setZoom] = useState<number>(1);
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 });

  const [sidebarOpened, setSidebarOpened] = useState(true);
  const [propertiesPanelOpened, setPropertiesPanelOpened] = useState(true);

  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [projectTitle, setProjectTitle] = useState('Loading...');
  const [isTemplate, setIsTemplate] = useState<boolean | undefined>(undefined);

  const [dimensions, setDimensions] = useState({ width: 850, height: 500 });
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { projectId } = useParams<{ projectId: string }>();
  const [projectData, setProjectData] = useState<string | null>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const notify = useNotification();

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isLocked = useRef(false);
  const clipboardRef = useRef<FabricObject | null>(null);

  useEffect(() => { canvasRef.current = canvas; }, [canvas]);

  const saveState = useCallback(() => {
    if (!canvas || isLocked.current) return;
    redoStack.current = [];
    setCanRedo(false);
    try {
      const json = JSON.stringify(canvas.toJSON());
      undoStack.current.push(json);
      if (undoStack.current.length > 50) undoStack.current.shift();
      setCanUndo(true);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    const initialState = JSON.stringify(canvas.toJSON());
    undoStack.current = [initialState];
    Promise.resolve().then(() => setCanUndo(true));

    const handleModification = () => saveState();
    canvas.on('object:added', handleModification);
    canvas.on('object:modified', handleModification);
    canvas.on('object:removed', handleModification);

    return () => {
      canvas.off('object:added', handleModification);
      canvas.off('object:modified', handleModification);
      canvas.off('object:removed', handleModification);
    };
  }, [canvas, saveState]);

  const handleUndo = useCallback(async () => {
    const c = canvasRef.current;
    if (!c || undoStack.current.length <= 1) return;
    isLocked.current = true;
    const currentState = undoStack.current.pop();
    if (currentState) { redoStack.current.push(currentState); setCanRedo(true); }
    const prevState = undoStack.current[undoStack.current.length - 1];
    if (prevState) {
      try {
        await c.loadFromJSON(JSON.parse(prevState));
        if (!c.backgroundColor || c.backgroundColor === 'transparent') c.backgroundColor = '#ffffff';
        c.renderAll();
      } catch (error) { console.error('Undo error:', error); }
    }
    setCanUndo(undoStack.current.length > 1);
    isLocked.current = false;
  }, []);

  const handleRedo = useCallback(async () => {
    const c = canvasRef.current;
    if (!c || redoStack.current.length === 0) return;
    isLocked.current = true;
    const nextState = redoStack.current.pop();
    if (nextState) {
      undoStack.current.push(nextState);
      setCanUndo(true);
      try {
        await c.loadFromJSON(JSON.parse(nextState));
        if (!c.backgroundColor || c.backgroundColor === 'transparent') c.backgroundColor = '#ffffff';
        c.renderAll();
      } catch (error) { console.error('Redo error:', error); }
    }
    setCanRedo(redoStack.current.length > 0);
    isLocked.current = false;
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const clip = new Rect({
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      width: dimensions.width,
      height: dimensions.height,
    });
    canvas.clipPath = clip;
    canvas.requestRenderAll();
  }, [canvas, dimensions]);

  const handleCopy = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const activeObject = c.getActiveObject();
    if (!activeObject) return;
    activeObject.clone().then((cloned: FabricObject) => {
      clipboardRef.current = cloned;
    }).catch((err: unknown) => console.error('Copy failed:', err));
  }, []);

  const handlePaste = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !clipboardRef.current) return;
    clipboardRef.current.clone().then((clonedObj: FabricObject) => {
      c.discardActiveObject();
      clonedObj.set({
        left: (clonedObj.left ?? 0) + 10,
        top: (clonedObj.top ?? 0) + 10,
        evented: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((clonedObj as any).type === 'activeselection') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sel = clonedObj as any;
        sel.canvas = c;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sel.forEachObject((obj: any) => c.add(obj));
        clonedObj.setCoords();
      } else {
        c.add(clonedObj);
      }
      // Offset clipboard so subsequent pastes stack nicely
      clipboardRef.current!.set({
        left: (clipboardRef.current!.left ?? 0) + 10,
        top: (clipboardRef.current!.top ?? 0) + 10,
      });
      c.setActiveObject(clonedObj);
      c.requestRenderAll();
    }).catch((err: unknown) => console.error('Paste failed:', err));
  }, []);

  const handleFitToCanvas = useCallback(() => {
    if (!canvas || !mainAreaRef.current) return;
    const containerWidth = mainAreaRef.current.clientWidth;
    const containerHeight = mainAreaRef.current.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const scaleX = containerWidth / dimensions.width;
    const scaleY = containerHeight / dimensions.height;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.85;
    const visualOffsetLeft = 270;
    const panX = (containerWidth - dimensions.width * newZoom) / 2 - visualOffsetLeft;
    const panY = (containerHeight - dimensions.height * newZoom) / 2;

    canvas.setZoom(newZoom);
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, panX, panY]);
    setViewport({ zoom: newZoom, panX, panY });
    setZoom(newZoom);
    canvas.renderAll();
  }, [canvas, dimensions]);

  const [initialFitDone, setInitialFitDone] = useState(false);
  useEffect(() => {
    if (canvas && mainAreaRef.current && dimensions.width > 0 && !initialFitDone) {
      setTimeout(() => { handleFitToCanvas(); setInitialFitDone(true); }, 350);
    }
  }, [canvas, dimensions, initialFitDone, handleFitToCanvas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste]);

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('title, canvas_data, is_template')
        .eq('id', projectId)
        .single();
      if (error) {
        notify.error('Load Failed', 'Could not load project data.');
      } else if (data) {
        setProjectTitle(data.title);
        setIsTemplate(data.is_template);
        if (data.canvas_data) {
          const loadedData = data.canvas_data as LoadedCanvasData;
          if (loadedData.width && loadedData.height) {
            setDimensions({ width: loadedData.width, height: loadedData.height });
          }
          setProjectData(JSON.stringify(loadedData));
        }
      }
    };
    fetchProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const withDesignDimensions = async <T,>(fn: () => T | Promise<T>): Promise<T> => {
    const c = canvasRef.current;
    if (!c || !mainAreaRef.current) return await fn();
    const vpt = c.viewportTransform ? [...c.viewportTransform] : [1, 0, 0, 1, 0, 0];
    const containerW = mainAreaRef.current.clientWidth;
    const containerH = mainAreaRef.current.clientHeight;
    const originalBg = c.backgroundColor;
    const originalClip = c.clipPath;
    try {
      c.discardActiveObject();
      c.setDimensions({ width: dimensions.width, height: dimensions.height });
      c.setViewportTransform([1, 0, 0, 1, 0, 0]);
      c.backgroundColor = '#ffffff';
      c.clipPath = undefined;
      c.renderAll();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 50));
      return await fn();
    } finally {
      c.backgroundColor = originalBg || '';
      c.clipPath = originalClip;
      c.setDimensions({ width: containerW, height: containerH });
      c.setViewportTransform(vpt as [number, number, number, number, number, number]);
      c.renderAll();
    }
  };

  const handleSaveProject = async () => {
    if (!projectId || !canvas) return;
    let thumbnailUrl: string | null = null;
    try {
      const dataURL = await withDesignDimensions(() =>
        canvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 0.5, left: 0, top: 0, width: dimensions.width, height: dimensions.height, enableRetinaScaling: false })
      );
      const blob = await fetch(dataURL).then((r) => r.blob());
      const filePath = `${projectId}.png`;
      const { error: uploadError } = await supabase.storage
        .from('project-thumbnails')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' });
      if (!uploadError) {
        const { data } = supabase.storage.from('project-thumbnails').getPublicUrl(filePath);
        thumbnailUrl = `${data.publicUrl}?t=${Date.now()}`;
      } else {
        thumbnailUrl = dataURL;
      }
    } catch (error) { console.error('Error saving thumbnail:', error); }

    const baseJson = canvas.toJSON();
    const canvasJson = { ...baseJson, width: dimensions.width, height: dimensions.height, backgroundColor: '#ffffff' };
    const updatePayload: Record<string, unknown> = { canvas_data: canvasJson, updated_at: new Date().toISOString() };
    if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl;

    const { error } = await supabase.from('projects').update(updatePayload).eq('id', projectId);
    if (error) notify.error('Save Failed', error.message);
    else {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      notify.success('Project Saved', 'Your design has been saved successfully.');
    }
  };

  const handleDownload = async (format: 'png' | 'jpeg' | 'pdf', quality: number, multiplier: number) => {
    if (!canvas) return;
    await withDesignDimensions(() => {
      if (format === 'pdf') {
        const imgData = canvas.toDataURL({ format: 'png', multiplier, left: 0, top: 0, width: dimensions.width, height: dimensions.height });
        const orientation = dimensions.width > dimensions.height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'px', [dimensions.width, dimensions.height]);
        pdf.addImage(imgData, 'PNG', 0, 0, dimensions.width, dimensions.height);
        pdf.save(`${projectTitle}.pdf`);
      } else {
        const dataURL = canvas.toDataURL({ format, quality, multiplier, left: 0, top: 0, width: dimensions.width, height: dimensions.height });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${projectTitle}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    notify.success('Download Started', `Your ${format.toUpperCase()} file is downloading.`);
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!projectId) return;
    const { error } = await supabase.from('projects').update({ title: newTitle }).eq('id', projectId);
    if (error) notify.error('Update Failed', error.message);
    else setProjectTitle(newTitle);
  };

  const handleResize = (newDimensions: { width: number; height: number }) => {
    setDimensions(newDimensions);
    setIsResizeModalOpen(false);
    if (canvas) saveState();

    if (canvas && mainAreaRef.current) {
      const containerWidth = mainAreaRef.current.clientWidth;
      const containerHeight = mainAreaRef.current.clientHeight;
      if (containerWidth > 0 && containerHeight > 0) {
        const scaleX = containerWidth / newDimensions.width;
        const scaleY = containerHeight / newDimensions.height;
        const newZoom = Math.min(scaleX, scaleY, 1) * 0.85;
        const visualOffsetLeft = 270;
        const panX = (containerWidth - newDimensions.width * newZoom) / 2 - visualOffsetLeft;
        const panY = (containerHeight - newDimensions.height * newZoom) / 2;
        canvas.setZoom(newZoom);
        canvas.setViewportTransform([newZoom, 0, 0, newZoom, panX, panY]);
        setViewport({ zoom: newZoom, panX, panY });
        setZoom(newZoom);
        canvas.renderAll();
      }
    }

    notify.show('Canvas Resized', `${newDimensions.width} x ${newDimensions.height} px`, 'info');
  };

  const handleZoomIn = () => {
    if (!canvas) return;
    const newZoom = Math.min(canvas.getZoom() * 1.2, 20);
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, newZoom);
    const vpt = canvas.viewportTransform!;
    setViewport({ zoom: vpt[0], panX: vpt[4], panY: vpt[5] });
    setZoom(vpt[0]);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!canvas) return;
    const newZoom = Math.max(canvas.getZoom() / 1.2, 0.1);
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, newZoom);
    const vpt = canvas.viewportTransform!;
    setViewport({ zoom: vpt[0], panX: vpt[4], panY: vpt[5] });
    setZoom(vpt[0]);
    canvas.renderAll();
  };

  const contextValue: CanvasContextType = { canvas, selectedObject, zoom, setZoom };

  return (
    <CanvasContext.Provider value={contextValue}>
      <AppShell
        padding={0}
        styles={{ main: { height: 'calc(100vh - 60px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
        layout="default"
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: true, desktop: !sidebarOpened } }}
        aside={{ width: 300, breakpoint: 'sm', collapsed: { mobile: true, desktop: !propertiesPanelOpened || !selectedObject } }}
        header={{ height: 60 }}
      >
        <AppShell.Header zIndex={200}>
          <EditorHeader
            projectTitle={projectTitle}
            isTemplate={isTemplate}
            onUpdateTitle={handleUpdateTitle}
            onSave={handleSaveProject}
            sidebarOpened={sidebarOpened}
            onToggleSidebar={() => setSidebarOpened(!sidebarOpened)}
            propertiesPanelOpened={propertiesPanelOpened}
            onTogglePropertiesPanel={() => setPropertiesPanelOpened(!propertiesPanelOpened)}
            onToggleResizeModal={() => setIsResizeModalOpen(true)}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToCanvas={handleFitToCanvas}
            onToggleDownloadModal={() => setIsDownloadModalOpen(true)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </AppShell.Header>

        <AppShell.Navbar>
          {sidebarOpened && <EditorSidebar opened={sidebarOpened} onToggle={() => setSidebarOpened(!sidebarOpened)} />}
        </AppShell.Navbar>

        <AppShell.Aside>
          {propertiesPanelOpened && selectedObject && (
            <PropertiesPanel
              opened={propertiesPanelOpened}
              onToggle={() => setPropertiesPanelOpened(!propertiesPanelOpened)}
            />
          )}
        </AppShell.Aside>

        <AppShell.Main ref={mainAreaRef}>
          <CanvasComponent
            setCanvas={setCanvas}
            setSelectedObject={setSelectedObject}
            projectData={projectData}
            width={dimensions.width}
            height={dimensions.height}
            viewport={viewport}
          />
        </AppShell.Main>
      </AppShell>

      <ResizeModal
        opened={isResizeModalOpen}
        onClose={() => setIsResizeModalOpen(false)}
        onResize={handleResize}
        currentDimensions={dimensions}
      />
      <DownloadModal
        opened={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownload={handleDownload}
      />
    </CanvasContext.Provider>
  );
};

export default CanvaEditor;

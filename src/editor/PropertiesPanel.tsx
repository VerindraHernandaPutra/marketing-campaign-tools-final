import React, { useEffect, useState } from 'react';
import {
  Text, ScrollArea, Stack, Divider, ColorSwatch, Group, NumberInput,
  Select, Button, TextInput, Box, Slider, ColorInput, Tooltip, ActionIcon,
} from '@mantine/core';
import { useFabricCanvas } from './CanvasContext';
import { Object as FabricObject, Textbox, Rect, Circle, Triangle, Line, Ellipse, Polygon, Polyline } from 'fabric';
import {
  RotateCcwIcon, RotateCwIcon, TrashIcon, ChevronsUpIcon, ChevronsDownIcon,
  ChevronUpIcon, ChevronDownIcon, LayersIcon,
} from 'lucide-react';

const FONT_LIST = [
  // System fonts
  'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact',
  // Sans-serif
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Inter',
  'Barlow', 'DM Sans', 'Work Sans', 'Outfit', 'Figtree', 'Plus Jakarta Sans', 'Mulish', 'Karla',
  'Fira Sans', 'Hind', 'Exo 2', 'Kanit', 'Josefin Sans', 'Cabin', 'Rubik', 'Oxygen',
  'Source Sans 3', 'Ubuntu',
  // Serif
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Libre Baskerville', 'Bitter',
  'Crimson Text', 'EB Garamond', 'Cormorant Garamond', 'Spectral', 'Cardo', 'Zilla Slab',
  'Source Serif 4', 'Domine',
  // Display
  'Oswald', 'Bebas Neue', 'Anton', 'Bangers', 'Lobster', 'Pacifico', 'Righteous',
  'Fredoka One', 'Boogaloo', 'Abril Fatface', 'Lilita One', 'Patua One', 'Special Elite',
  'Permanent Marker', 'Press Start 2P',
  // Script / Handwriting
  'Dancing Script', 'Great Vibes', 'Satisfy', 'Sacramento', 'Caveat', 'Kaushan Script',
  'Courgette', 'Merienda', 'Amatic SC', 'Handlee', 'Cookie', 'Shadows Into Light', 'Indie Flower',
  // Monospace
  'Roboto Mono', 'Source Code Pro', 'Fira Code', 'Space Mono', 'Inconsolata',
  'Courier Prime', 'JetBrains Mono', 'Anonymous Pro',
];

interface PropertiesPanelProps {
  opened: boolean;
  onToggle: () => void;
}

const isTextbox = (obj: FabricObject | null): obj is Textbox => {
  return obj?.type === 'textbox' || obj?.type === 'i-text';
};

const isShape = (obj: FabricObject | null): obj is (Rect | Circle | Triangle | Line | Ellipse | Polygon | Polyline) => {
  if (!obj) return false;
  return ['rect', 'circle', 'triangle', 'line', 'ellipse', 'polygon', 'polyline'].includes(obj.type || '');
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = () => {
  const { canvas, selectedObject } = useFabricCanvas();

  const [opacity, setOpacity] = useState(selectedObject?.get('opacity') || 1);
  const [text, setText] = useState(isTextbox(selectedObject) ? selectedObject.text : '');
  const [fontSize, setFontSize] = useState(isTextbox(selectedObject) ? selectedObject.fontSize : 24);
  const [width, setWidth] = useState(selectedObject?.getScaledWidth() || 100);
  const [height, setHeight] = useState(selectedObject?.getScaledHeight() || 100);
  const [angle, setAngle] = useState(selectedObject?.get('angle') || 0);
  const [fillColor, setFillColor] = useState(selectedObject?.get('fill') as string || '#000000');
  const [strokeColor, setStrokeColor] = useState(selectedObject?.get('stroke') as string || '#000000');
  const [strokeWidth, setStrokeWidth] = useState(selectedObject?.get('strokeWidth') || 0);

  useEffect(() => {
    if (selectedObject) {
      setOpacity(selectedObject.get('opacity') || 1);
      setWidth(selectedObject.getScaledWidth());
      setHeight(selectedObject.getScaledHeight());
      setAngle(selectedObject.get('angle') || 0);
      setFillColor(selectedObject.get('fill') as string || '#000000');
      setStrokeColor(selectedObject.get('stroke') as string || '#000000');
      setStrokeWidth(selectedObject.get('strokeWidth') || 0);
      if (isTextbox(selectedObject)) {
        setText(selectedObject.text || '');
        setFontSize(selectedObject.fontSize || 24);
      }
    }
  }, [selectedObject]);

  const handlePropertyChange = (property: string, value: string | number | boolean | undefined) => {
    if (!canvas || !selectedObject) return;
    selectedObject.set(property, value);
    if (property === 'angle') setAngle(Number(value) || 0);
    if (property === 'strokeWidth') setStrokeWidth(Number(value) || 0);
    selectedObject.setCoords();
    canvas.renderAll();
  };

  const handleFillChange = (color: string) => {
    if (!canvas || !selectedObject) return;
    setFillColor(color);
    selectedObject.set('fill', color);
    canvas.renderAll();
  };

  const handleStrokeChange = (color: string) => {
    if (!canvas || !selectedObject) return;
    setStrokeColor(color);
    selectedObject.set('stroke', color);
    canvas.renderAll();
  };

  const handleOpacityChange = (value: number) => {
    if (!canvas || !selectedObject) return;
    setOpacity(value);
    selectedObject.set('opacity', value);
    canvas.renderAll();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !isTextbox(selectedObject)) return;
    const newText = e.currentTarget.value;
    setText(newText);
    selectedObject.set('text', newText);
    canvas.renderAll();
  };

  const handleFontSizeChange = (value: number | string) => {
    if (!canvas || !isTextbox(selectedObject)) return;
    const newSize = Number(value);
    setFontSize(newSize);
    selectedObject.set('fontSize', newSize);
    canvas.renderAll();
  };

  const handleDimensionChange = (dim: 'width' | 'height', value: number | string) => {
    if (!canvas || !selectedObject) return;
    const numValue = Number(value);
    if (dim === 'width') {
      setWidth(numValue);
      if (selectedObject.width) selectedObject.set('scaleX', numValue / selectedObject.width);
    } else {
      setHeight(numValue);
      if (selectedObject.height) selectedObject.set('scaleY', numValue / selectedObject.height);
    }
    selectedObject.setCoords();
    canvas.renderAll();
  };

  const handleRotate = (direction: 'left' | 'right') => {
    if (!canvas || !selectedObject) return;
    let newAngle = direction === 'right' ? angle + 90 : angle - 90;
    newAngle = (newAngle + 360) % 360;
    setAngle(newAngle);
    selectedObject.set('angle', newAngle);
    selectedObject.setCoords();
    canvas.renderAll();
  };

  const handleLayerPosition = (action: 'front' | 'back' | 'forward' | 'backward') => {
    if (!canvas || !selectedObject) return;
    switch (action) {
      case 'front': canvas.bringObjectToFront(selectedObject); break;
      case 'back': canvas.sendObjectToBack(selectedObject); break;
      case 'forward': canvas.bringObjectForward(selectedObject); break;
      case 'backward': canvas.sendObjectBackwards(selectedObject); break;
    }
    canvas.renderAll();
  };

  const handleDelete = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const colors = [
    '#25262b', '#868e96', '#fa5252', '#e64980', '#be4bdb', '#7950f2',
    '#4c6ef5', '#228be6', '#15aabf', '#12b886', '#40c057', '#82c91e',
    '#fab005', '#fd7e14', '#ffffff', 'transparent',
  ];

  if (!selectedObject) {
    return (
      <Box p="md" w={300}>
        <Text size="sm" ta="center" c="dimmed" mt="lg">Select an object to edit properties</Text>
      </Box>
    );
  }

  return (
    <Box p="md" w={300}>
      <ScrollArea h="calc(100vh - 60px)" mx="-xs" px="xs">
        <Text fw={500} size="sm" mb="md">
          {isTextbox(selectedObject) ? 'Text Properties' : isShape(selectedObject) ? 'Shape Properties' : 'Object Properties'}
        </Text>

        {isTextbox(selectedObject) && (
          <Stack gap="md">
            <div>
              <Text size="xs" fw={500} mb={4}>Text</Text>
              <TextInput value={text} onChange={handleTextChange} />
            </div>
            <div>
              <Text size="xs" fw={500} mb={4}>Font Size</Text>
              <NumberInput value={fontSize} onChange={handleFontSizeChange} min={8} max={120} />
            </div>
            <div>
              <Text size="xs" fw={500} mb={4}>Font Family</Text>
              <Select
                data={FONT_LIST}
                value={selectedObject.fontFamily || 'Arial'}
                onChange={(val) => handlePropertyChange('fontFamily', val || 'Arial')}
                searchable
                maxDropdownHeight={240}
                renderOption={({ option }) => (
                  <span style={{ fontFamily: option.value }}>{option.label}</span>
                )}
              />
            </div>
          </Stack>
        )}

        {isShape(selectedObject) && (
          <Stack gap="md">
            <div>
              <Text size="xs" fw={500} mb={4}>Width</Text>
              <NumberInput value={Math.round(width)} onChange={(val) => handleDimensionChange('width', val)} />
            </div>
            <div>
              <Text size="xs" fw={500} mb={4}>Height</Text>
              <NumberInput value={Math.round(height)} onChange={(val) => handleDimensionChange('height', val)} />
            </div>
            <div>
              <Text size="xs" fw={500} mb={4}>Rotation</Text>
              <NumberInput
                value={Math.round(angle)}
                onChange={(val) => handlePropertyChange('angle', Number(val))}
                min={0}
                max={360}
                step={1}
                suffix="°"
              />
            </div>
            <div>
              <Text size="xs" fw={500} mb={4}>Rotate</Text>
              <Group grow>
                <Button variant="default" leftSection={<RotateCcwIcon size={16} />} onClick={() => handleRotate('left')}>Left</Button>
                <Button variant="default" leftSection={<RotateCwIcon size={16} />} onClick={() => handleRotate('right')}>Right</Button>
              </Group>
            </div>
          </Stack>
        )}

        <Divider my="md" />

        <div>
          <Text size="xs" fw={500} mb={4}>Fill Color</Text>
          <ColorInput value={fillColor} onChange={handleFillChange} format="hex" placeholder="Custom color" />
          <Group gap="xs" mt="xs">
            {colors.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                size={22}
                style={{ cursor: 'pointer', border: color === 'transparent' ? '1px solid #ccc' : 'none' }}
                onClick={() => handleFillChange(color)}
              />
            ))}
          </Group>
        </div>

        <Stack gap="md" mt="md">
          <Divider />
          <div>
            <Text size="xs" fw={500} mb={4}>Border Color</Text>
            <ColorInput value={strokeColor} onChange={handleStrokeChange} format="hex" placeholder="Custom color" />
            <Group gap="xs" mt="xs">
              {colors.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  size={22}
                  style={{ cursor: 'pointer', border: color === 'transparent' ? '1px solid #ccc' : 'none' }}
                  onClick={() => handleStrokeChange(color)}
                />
              ))}
            </Group>
          </div>
          <div>
            <Text size="xs" fw={500} mb={4}>Border Width</Text>
            <NumberInput value={strokeWidth} onChange={(val) => handlePropertyChange('strokeWidth', val)} min={0} step={1} />
          </div>
        </Stack>

        <div>
          <Divider my="md" />
          <Text size="xs" fw={500} mb={4}>Opacity</Text>
          <Slider
            value={opacity}
            onChange={handleOpacityChange}
            min={0}
            max={1}
            step={0.01}
            label={(value) => `${Math.round(value * 100)}%`}
          />
        </div>

        <div>
          <Divider my="md" />
          <Group gap="xs" align="center" mb="xs">
            <LayersIcon size={16} />
            <Text size="xs" fw={500}>Position / Layers</Text>
          </Group>
          <Group grow>
            <Tooltip label="Bring to Front">
              <ActionIcon variant="default" size="lg" onClick={() => handleLayerPosition('front')}>
                <ChevronsUpIcon size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Bring Forward">
              <ActionIcon variant="default" size="lg" onClick={() => handleLayerPosition('forward')}>
                <ChevronUpIcon size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Send Backward">
              <ActionIcon variant="default" size="lg" onClick={() => handleLayerPosition('backward')}>
                <ChevronDownIcon size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Send to Back">
              <ActionIcon variant="default" size="lg" onClick={() => handleLayerPosition('back')}>
                <ChevronsDownIcon size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>

        <div style={{ marginTop: 32, marginBottom: 16 }}>
          <Button color="red" variant="light" fullWidth leftSection={<TrashIcon size={16} />} onClick={handleDelete}>
            Delete Element
          </Button>
        </div>
      </ScrollArea>
    </Box>
  );
};

export default PropertiesPanel;

import { useEffect, useRef, useState } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children: string[];
  parent?: string;
  hasLatex?: boolean;
}

interface MindMapProps {
  title: string;
  rootNodeId: string;
  nodes: Record<string, MindMapNode>;
}

// Colors for different levels of nodes
const COLORS = [
  '#4F46E5', // Indigo 600
  '#7C3AED', // Violet 600
  '#DB2777', // Pink 600
  '#F59E0B', // Amber 500
  '#10B981', // Emerald 500
  '#3B82F6', // Blue 500
];

// Node size and spacing
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const VERTICAL_SPACING = 160;   // Space between levels
const NODE_RADIUS = 10;         // Rounded corners radius

// Add MathJax configuration options for better rendering
const mathJaxOptions = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined', 'autoload', 'color', 'newcommand'],
    macros: {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}"
    }
  },
  svg: {
    fontCache: 'global',
    scale: 1.2,
    minScale: 0.5,
    mtextInheritFont: false,
    merrorInheritFont: true,
    mathmlSpacing: false,
  },
  displayAlign: 'left',
  output: 'svg',
  chtml: {
    scale: 1.2,
  },
  loader: {
    load: ['[tex]/autoload', '[tex]/noerrors', '[tex]/color', '[tex]/newcommand']
  }
};

const MindMap: React.FC<MindMapProps> = ({ title, rootNodeId, nodes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1500, height: 1200 }); // Initial canvas size
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
  const [nodeLevels, setNodeLevels] = useState<Record<string, number>>({});
  const [debug, setDebug] = useState<{message: string, hasError: boolean}>({message: "", hasError: false});
  const [animationFrame, setAnimationFrame] = useState(0); // For subtle animation
  const [nodeScales, setNodeScales] = useState<Record<string, number>>({}); // For hover animation
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  // Set device pixel ratio for high resolution rendering
  useEffect(() => {
    setDevicePixelRatio(window.devicePixelRatio || 1);
  }, []);

  // Resize canvas based on container size for responsive layout
  useEffect(() => {
    const resizeCanvas = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Update canvas logical size based on container
        setCanvasSize(prevSize => ({
          width: Math.max(width, prevSize.width),
          height: Math.max(height, prevSize.height)
        }));
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Apply device pixel ratio to canvas for high DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions with device pixel ratio for sharper rendering
    canvas.width = canvasSize.width * devicePixelRatio;
    canvas.height = canvasSize.height * devicePixelRatio;
    
    // Scale canvas CSS dimensions to match logical size
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
  }, [canvasSize, devicePixelRatio]);

  // Add debugging for the props
  useEffect(() => {
    console.log("MindMap Props:", { title, rootNodeId, nodes });
    
    // Validate the props
    if (!rootNodeId) {
      setDebug({message: "Missing rootNodeId prop", hasError: true});
      return;
    }
    
    if (!nodes) {
      setDebug({message: "Missing nodes prop", hasError: true});
      return;
    }
    
    if (!nodes[rootNodeId]) {
      setDebug({message: `Root node with ID "${rootNodeId}" not found in nodes object`, hasError: true});
      return;
    }
    
    setDebug({message: "Props validated successfully", hasError: false});
  }, [title, rootNodeId, nodes]);

  // Initialize node scales for animation
  useEffect(() => {
    const initialScales: Record<string, number> = {};
    Object.keys(nodes).forEach(nodeId => {
      initialScales[nodeId] = 1.0;
    });
    setNodeScales(initialScales);
  }, [nodes]);

  // Calculate node levels (distance from root)
  useEffect(() => {
    if (!rootNodeId || !nodes[rootNodeId]) return;
    
    const levels: Record<string, number> = {};
    
    // BFS to calculate levels
    const queue = [{ id: rootNodeId, level: 0 }];
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      levels[id] = level;
      
      const node = nodes[id];
      if (!node) continue;
      
      (node.children || []).forEach(childId => {
        if (!levels[childId]) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }
    
    setNodeLevels(levels);
  }, [rootNodeId, nodes]);

  // Calculate node positions with improved layout algorithm
  useEffect(() => {
    if (!rootNodeId || !nodes[rootNodeId] || Object.keys(nodeLevels).length === 0) {
      return;
    }
    
    const positions: Record<string, { x: number, y: number }> = {};
    let maxWidth = 0;
    let maxHeight = 0;
    
    // Group nodes by level
    const nodesByLevel: Record<number, string[]> = {};
    Object.entries(nodeLevels).forEach(([nodeId, level]) => {
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(nodeId);
    });
    
    // Position root node
    positions[rootNodeId] = { 
      x: canvasSize.width / 2, 
      y: 100 
    };
    
    // Position nodes level by level
    Object.entries(nodesByLevel).forEach(([levelStr, nodeIds]) => {
      const level = parseInt(levelStr);
      if (level === 0) return; // Skip root node
      
      const nodesInLevel = nodeIds.length;
      const levelWidth = canvasSize.width * 0.8;
      const startX = (canvasSize.width - levelWidth) / 2;
      
      // For each node in this level
      nodeIds.forEach((nodeId, i) => {
        // Find parent node
        const parent = Object.keys(nodes).find(id => (nodes[id].children || []).includes(nodeId));
        
        if (!parent || !positions[parent]) {
          return; // Skip if parent not positioned yet
        }
        
        let x: number;
        if (nodesInLevel === 1) {
          // If only node in level, place under parent
          x = positions[parent].x;
        } else {
          // Calculate x position based on position in level
          const spacing = levelWidth / (nodesInLevel - 1 || 1);
          x = startX + i * spacing;
          
          // Apply parent bias to keep nodes closer to their parent
          const parentX = positions[parent].x;
          x = x * 0.7 + parentX * 0.3;
        }
        
        // Calculate y position based on level
        const y = 100 + level * VERTICAL_SPACING;
        
        positions[nodeId] = { x, y };
        
        // Update max dimensions
        maxWidth = Math.max(maxWidth, x + NODE_WIDTH);
        maxHeight = Math.max(maxHeight, y + NODE_HEIGHT);
      });
    });
    
    // Resolve overlaps
    const resolveOverlaps = () => {
      let overlapsResolved = false;
      
      // For each level except root
      Object.entries(nodesByLevel).forEach(([levelStr, nodeIds]) => {
        const level = parseInt(levelStr);
        if (level === 0) return;
        
        // Sort nodes by x position
        nodeIds.sort((a, b) => positions[a].x - positions[b].x);
        
        // Check for overlaps and fix them
        for (let i = 0; i < nodeIds.length - 1; i++) {
          const current = nodeIds[i];
          const next = nodeIds[i + 1];
          
          if (!positions[current] || !positions[next]) continue;
          
          const rightEdge = positions[current].x + NODE_WIDTH + 20; // Add a small gap
          const leftEdge = positions[next].x;
          
          if (rightEdge > leftEdge) {
            // Overlap detected, push both nodes apart
            const overlap = rightEdge - leftEdge;
            positions[current].x -= overlap / 2;
            positions[next].x += overlap / 2;
            overlapsResolved = true;
          }
        }
      });
      
      return overlapsResolved;
    };
    
    // Iteratively resolve overlaps until none remain
    for (let i = 0; i < 5; i++) {
      if (!resolveOverlaps()) break;
    }
    
    // Update canvas size if needed
    setCanvasSize({ 
      width: Math.max(canvasSize.width, maxWidth + 200),
      height: Math.max(canvasSize.height, maxHeight + 200)
    });
    
    setNodePositions(positions);
  }, [rootNodeId, nodes, nodeLevels, canvasSize.width, canvasSize.height]);
  
  // Subtle breathing animation effect
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(animationInterval);
  }, []);
  
  // Update node scales for hover/selected animations
  useEffect(() => {
    const newScales = { ...nodeScales };
    
    Object.keys(nodes).forEach(nodeId => {
      // Target scale based on node state
      const targetScale = nodeId === hoveredNode ? 1.05 : 
                          nodeId === selectedNode ? 1.1 : 1.0;
      
      // Smoothly animate toward target scale
      newScales[nodeId] = newScales[nodeId] * 0.9 + targetScale * 0.1;
    });
    
    setNodeScales(newScales);
  }, [hoveredNode, selectedNode, animationFrame, nodes, nodeScales]);
  
  // Draw the mind map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with proper dimensions
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations with DPI correction
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    
    // Enable antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw connections first (so they appear behind nodes)
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      const position = nodePositions[nodeId];
      
      if (!position) return;
      
      const children = node.children || [];
      children.forEach(childId => {
        const childPosition = nodePositions[childId];
        
        if (!childPosition) return;
        
        // Get node level
        const level = nodeLevels[nodeId] || 0;
        const color = COLORS[level % COLORS.length];
        
        // Draw curved connection
        const startX = position.x + NODE_WIDTH / 2;
        const startY = position.y + NODE_HEIGHT;
        const endX = childPosition.x + NODE_WIDTH / 2;
        const endY = childPosition.y;
        
        ctx.beginPath();
        
        // Draw a curve with control points
        const controlY = startY + (endY - startY) * 0.5;
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
          startX, controlY,
          endX, controlY,
          endX, endY
        );
        
        // Style based on whether this connection involves selected/hovered nodes
        if (nodeId === selectedNode || nodeId === hoveredNode || 
            childId === selectedNode || childId === hoveredNode) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          
          // Add glow effect for selected paths
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = 'transparent';
        }
        
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        
        // Add direction arrow
        const arrowSize = 8;
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        
        // Calculate arrow position (at 80% of the way from start to end)
        const arrowX = startX + dx * 0.8;
        const arrowY = startY + dy * 0.8;
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6), 
                  arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6), 
                  arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      });
    });
    
    // Draw nodes
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      const position = nodePositions[nodeId];
      
      if (!position) return;
      
      // Get node level
      const level = nodeLevels[nodeId] || 0;
      const color = COLORS[level % COLORS.length];
      
      // Apply scale animation
      const nodeScale = nodeScales[nodeId] || 1.0;
      const scaledWidth = NODE_WIDTH * nodeScale;
      const scaledHeight = NODE_HEIGHT * nodeScale;
      const offsetX = (scaledWidth - NODE_WIDTH) / 2;
      const offsetY = (scaledHeight - NODE_HEIGHT) / 2;
      
      // Draw node background
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = nodeId === selectedNode ? 4 : 
                     nodeId === hoveredNode ? 3 : 2;
      
      // Add shadow
      if (nodeId === selectedNode || nodeId === hoveredNode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      
      // Draw rounded rectangle with scale
      const radius = NODE_RADIUS;
      const x = position.x - offsetX;
      const y = position.y - offsetY;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + scaledWidth - radius, y);
      ctx.quadraticCurveTo(x + scaledWidth, y, x + scaledWidth, y + radius);
      ctx.lineTo(x + scaledWidth, y + scaledHeight - radius);
      ctx.quadraticCurveTo(x + scaledWidth, y + scaledHeight, x + scaledWidth - radius, y + scaledHeight);
      ctx.lineTo(x + radius, y + scaledHeight);
      ctx.quadraticCurveTo(x, y + scaledHeight, x, y + scaledHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      
      // Fill with subtle gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + scaledHeight);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, `${color}10`); // Very light color
      ctx.fillStyle = gradient;
      
      ctx.fill();
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      
      // Add a subtle accent line at the top
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + scaledWidth - radius, y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();
      
      // Draw node label
      ctx.fillStyle = '#1F2937';
      ctx.font = `bold ${14 * nodeScale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Wrap text if needed
      const words = node.label.split(' ');
      let line = '';
      let textY = y + scaledHeight / 2 - 10 * nodeScale;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > scaledWidth - 20 && i > 0) {
          ctx.fillText(line, x + scaledWidth / 2, textY);
          line = words[i] + ' ';
          textY += 20 * nodeScale;
        } else {
          line = testLine;
        }
      }
      
      ctx.fillText(line, x + scaledWidth / 2, textY);
      
      // Indicate if node has children
      if (node.children && node.children.length > 0) {
        const indicatorY = y + scaledHeight - 12;
        const indicatorX = x + scaledWidth / 2;
        
        ctx.beginPath();
        ctx.moveTo(indicatorX - 5, indicatorY - 2);
        ctx.lineTo(indicatorX, indicatorY + 3);
        ctx.lineTo(indicatorX + 5, indicatorY - 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });
    
    ctx.restore();
  }, [nodes, rootNodeId, nodePositions, nodeLevels, hoveredNode, selectedNode, offset, scale, nodeScales, animationFrame, devicePixelRatio]);
  
  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2, scale + delta));
    
    setScale(newScale);
  };
  
  // Handle mouse down for dragging or selecting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    
    // Check if mouse is over any node
    let clickedNode = null;
    Object.keys(nodePositions).forEach(nodeId => {
      const pos = nodePositions[nodeId];
      if (
        x >= pos.x && x <= pos.x + NODE_WIDTH &&
        y >= pos.y && y <= pos.y + NODE_HEIGHT
      ) {
        clickedNode = nodeId;
      }
    });
    
    if (clickedNode) {
      // If clicked on a node, select/deselect it
      setSelectedNode(selectedNode === clickedNode ? null : clickedNode);
    } else {
      // Otherwise start dragging
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };
  
  // Handle mouse move for dragging and hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    // Check for hover
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    
    // Check if mouse is over any node
    let hoveredNodeId = null;
    Object.keys(nodePositions).forEach(nodeId => {
      const pos = nodePositions[nodeId];
      if (
        x >= pos.x && x <= pos.x + NODE_WIDTH &&
        y >= pos.y && y <= pos.y + NODE_HEIGHT
      ) {
        hoveredNodeId = nodeId;
      }
    });
    
    // Set cursor style based on hover state
    if (canvas) {
      canvas.style.cursor = hoveredNodeId ? 'pointer' : dragging ? 'grabbing' : 'grab';
    }
    
    setHoveredNode(hoveredNodeId);
  };
  
  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setDragging(false);
  };
  
  // Handle mouse leave to stop dragging
  const handleMouseLeave = () => {
    setDragging(false);
    setHoveredNode(null);
  };
  
  // Reset view
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
  };
  
  // Center on a specific node
  const centerOnNode = (nodeId: string) => {
    const position = nodePositions[nodeId];
    if (!position) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    setOffset({
      x: rect.width / 2 - position.x * scale - NODE_WIDTH / 2 * scale,
      y: rect.height / 2 - position.y * scale - NODE_HEIGHT / 2 * scale
    });
    
    setSelectedNode(nodeId);
  };
  
  // Center on root node
  const centerOnRoot = () => {
    centerOnNode(rootNodeId);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-50 rounded-t-lg border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {debug.hasError && (
          <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
            Error: {debug.message}
          </div>
        )}
        <div className="mt-2 flex space-x-2 flex-wrap">
          <button 
            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
            onClick={resetView}
          >
            Reset View
          </button>
          <button 
            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
            onClick={centerOnRoot}
          >
            Center Root
          </button>
          <button 
            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
            onClick={() => setScale(Math.min(2, scale + 0.1))}
          >
            Zoom In
          </button>
          <button 
            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          >
            Zoom Out
          </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-gradient-to-b from-indigo-50 to-white rounded-b-lg"
      >
        <canvas
          ref={canvasRef}
          className={`transition-opacity duration-300 ${Object.keys(nodePositions).length > 0 ? 'opacity-100' : 'opacity-0'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        
        {debug.hasError ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold">
            {debug.message}
          </div>
        ) : Object.keys(nodePositions).length === 0 && !debug.hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <p className="mt-2">Loading mind map...</p>
            </div>
          </div>
        )}
        
        {(hoveredNode || selectedNode) && nodes[hoveredNode || selectedNode!]?.description && (
          <div className="absolute bottom-4 left-4 right-4 max-w-xl mx-auto bg-white p-5 rounded-xl shadow-xl border border-gray-200 transform transition-all duration-200 ease-in-out">
            <h3 className="font-medium text-lg text-gray-900 mb-2">
              {nodes[hoveredNode || selectedNode!].hasLatex ? (
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
                >
                  {nodes[hoveredNode || selectedNode!].label}
                </ReactMarkdown>
              ) : (
                nodes[hoveredNode || selectedNode!].label
              )}
            </h3>
            <div className="text-sm text-gray-600 prose prose-sm max-w-none">
              {nodes[hoveredNode || selectedNode!].hasLatex ? (
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[[rehypeMathjax, mathJaxOptions]]}
                >
                  {nodes[hoveredNode || selectedNode!].description}
                </ReactMarkdown>
              ) : (
                <p>{nodes[hoveredNode || selectedNode!].description}</p>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Use global styles instead of jsx prop to avoid TypeScript errors */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .transform {
          transform-origin: center bottom;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default MindMap; 
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface RelationshipGraphProps {
  documentIds: string[];
  userId: string;
}

interface Node {
  id: string;
  label: string;
  type: 'document' | 'concept' | 'theme';
  size: number;
  metadata?: any;
}

interface Link {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface Graph {
  nodes: Node[];
  links: Link[];
}

export function RelationshipGraph({ documentIds, userId }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<Graph>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'force' | 'hierarchical' | 'radial'>('force');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetchKnowledgeGraph();
  }, [documentIds]);

  useEffect(() => {
    if (graph.nodes.length > 0 && svgRef.current) {
      renderGraph();
    }
  }, [graph, viewMode]);

  const fetchKnowledgeGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cross-document/knowledge-graph?depth=2`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await res.json();
      setGraph(data.graph || { nodes: [], links: [] });
    } catch (error) {
      console.error('Error fetching knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = () => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 600;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const g = svg.append('g');

    // Create arrow markers
    svg.append('defs').selectAll('marker')
      .data(['end'])
      .enter().append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', -0.5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#999')
      .attr('d', 'M0,-5L10,0L0,5');

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(graph.nodes)
      .force('link', d3.forceLink<Node, Link>(graph.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(graph.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight))
      .attr('marker-end', 'url(#arrow)');

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(graph.nodes)
      .enter().append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => {
        switch (d.type) {
          case 'document': return '#3b82f6';
          case 'concept': return '#10b981';
          case 'theme': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node.append('text')
      .text(d => d.label)
      .attr('x', 0)
      .attr('y', d => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#374151');

    // Add tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px');

    node.on('mouseover', (event, d) => {
      tooltip.transition().duration(200).style('opacity', .9);
      tooltip.html(`<strong>${d.label}</strong><br/>Type: ${d.type}<br/>Connections: ${
        graph.links.filter(l => l.source === d.id || l.target === d.id).length
      }`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition().duration(500).style('opacity', 0);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup tooltip on unmount
    return () => {
      d3.select('body').selectAll('.tooltip').remove();
    };
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  };

  const exportGraph = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select view mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">Force Layout</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">
            {graph.nodes.length} nodes, {graph.links.length} connections
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ArrowsPointingInIcon className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500 w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={exportGraph}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} className="w-full border rounded"></svg>
      </div>

      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span>Document</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Concept</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          <span>Theme</span>
        </div>
      </div>
    </Card>
  );
}
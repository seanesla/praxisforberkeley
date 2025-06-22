export interface NetworkNode {
  id: string;
  label: string;
  citationCount?: number;
  centralityScore?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export function convertToGraphML(network: Network): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
  xml += '  <key id="label" for="node" attr.name="label" attr.type="string"/>\n';
  xml += '  <key id="citations" for="node" attr.name="citations" attr.type="int"/>\n';
  xml += '  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>\n';
  xml += '  <graph id="G" edgedefault="directed">\n';
  
  // Add nodes
  network.nodes.forEach((node) => {
    xml += `    <node id="${escapeXml(node.id)}">\n`;
    xml += `      <data key="label">${escapeXml(node.label)}</data>\n`;
    xml += `      <data key="citations">${node.citationCount || 0}</data>\n`;
    xml += '    </node>\n';
  });
  
  // Add edges
  network.edges.forEach((edge, i) => {
    xml += `    <edge id="e${i}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">\n`;
    xml += `      <data key="weight">${edge.weight || 1}</data>\n`;
    xml += '    </edge>\n';
  });
  
  xml += '  </graph>\n';
  xml += '</graphml>';
  
  return xml;
}

export function convertToGEXF(network: Network): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\n';
  xml += '  <graph mode="static" defaultedgetype="directed">\n';
  xml += '    <nodes>\n';
  
  // Add nodes
  network.nodes.forEach((node) => {
    xml += `      <node id="${escapeXml(node.id)}" label="${escapeXml(node.label)}" />\n`;
  });
  
  xml += '    </nodes>\n';
  xml += '    <edges>\n';
  
  // Add edges
  network.edges.forEach((edge, i) => {
    xml += `      <edge id="${i}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}" weight="${edge.weight || 1}" />\n`;
  });
  
  xml += '    </edges>\n';
  xml += '  </graph>\n';
  xml += '</gexf>';
  
  return xml;
}

export function convertToCSV(network: Network): string {
  let csv = 'Source,Target,Weight,Type\n';
  
  network.edges.forEach((edge) => {
    csv += `"${escapeCsv(edge.source)}","${escapeCsv(edge.target)}",${edge.weight || 1},"citation"\n`;
  });
  
  return csv;
}

export function identifyClusters(network: Network): Array<{ id: number; size: number; mainTopic: string }> {
  const visited = new Set<string>();
  const clusters: Array<{ id: number; nodes: string[] }> = [];
  
  // Create adjacency list for efficient traversal
  const adjacencyList = new Map<string, Set<string>>();
  network.edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, new Set());
    }
    if (!adjacencyList.has(edge.target)) {
      adjacencyList.set(edge.target, new Set());
    }
    adjacencyList.get(edge.source)!.add(edge.target);
    adjacencyList.get(edge.target)!.add(edge.source); // For undirected clustering
  });
  
  network.nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const cluster: string[] = [];
      const queue = [node.id];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (!visited.has(current)) {
          visited.add(current);
          cluster.push(current);
          
          // Add connected nodes
          const neighbors = adjacencyList.get(current) || new Set();
          neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          });
        }
      }
      
      if (cluster.length > 1) {
        clusters.push({ id: clusters.length + 1, nodes: cluster });
      }
    }
  });

  return clusters.map(c => ({
    id: c.id,
    size: c.nodes.length,
    mainTopic: `Research Cluster ${c.id}` // In production, analyze content for topic
  }));
}

// Utility functions for escaping special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(str: string): string {
  return str.replace(/"/g, '""');
}
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MindMapNode as MindMapNodeType } from '@/types';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  DocumentTextIcon,
  LightBulbIcon,
  BeakerIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface MindMapNodeData extends MindMapNodeType {
  onToggleExpand?: (nodeId: string) => void;
  isSelected?: boolean;
}

const iconMap = {
  document: DocumentTextIcon,
  idea: LightBulbIcon,
  research: BeakerIcon,
  insight: SparklesIcon
};

const MindMapNode = memo(({ data, selected }: NodeProps<MindMapNodeData>) => {
  const Icon = data.icon ? iconMap[data.icon as keyof typeof iconMap] : null;
  
  const getNodeStyle = () => {
    const baseStyle = 'px-4 py-2 rounded-lg border-2 transition-all duration-200 cursor-pointer';
    
    switch (data.type) {
      case 'root':
        return `${baseStyle} bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/50 
                hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20`;
      case 'main':
        return `${baseStyle} bg-blue-500/10 border-blue-500/30 
                hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/20`;
      case 'sub':
        return `${baseStyle} bg-green-500/10 border-green-500/30 
                hover:border-green-500 hover:shadow-md hover:shadow-green-500/20`;
      case 'detail':
        return `${baseStyle} bg-gray-500/10 border-gray-500/30 
                hover:border-gray-500 hover:shadow-sm`;
      default:
        return `${baseStyle} bg-white/10 border-white/30`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onToggleExpand && data.metadata?.hasChildren) {
      data.onToggleExpand(data.id);
    }
  };

  return (
    <div className={`${getNodeStyle()} ${selected ? 'ring-2 ring-purple-400' : ''}`} onClick={handleClick}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-purple-500 border-none"
      />
      
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        
        <span className={`
          ${data.type === 'root' ? 'font-bold text-lg' : ''}
          ${data.type === 'main' ? 'font-semibold' : ''}
          ${data.type === 'detail' ? 'text-sm text-gray-400' : ''}
        `}>
          {data.text}
        </span>
        
        {data.metadata?.hasChildren && (
          <button
            className="ml-2 text-gray-400 hover:text-white transition-colors"
            onClick={handleClick}
          >
            {data.expanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      {data.metadata?.count && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs bg-purple-500 rounded-full">
          {data.metadata.count}
        </span>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-purple-500 border-none"
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';

export default MindMapNode;
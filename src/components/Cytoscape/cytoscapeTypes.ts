export type NodeData = {
    id: string;
  };
  
export type EdgeData = {
source: string;
target: string;
};

export type Node = {
data: NodeData;
classes: string;
};

export type Edge = {
data: EdgeData;
};

export type GraphData = {
nodes: Node[];
edges: Edge[];
};
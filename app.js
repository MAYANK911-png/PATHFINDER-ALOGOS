// app.js

// Grid config
const ROWS = 20;
const COLS = 40;

// State
let grid = [];
let startNode = null;
let endNode = null;
let isRunning = false;
let animationSpeed = 150;
let mouseIsPressed = false;
let currentWallAction = null; // "add" or "remove"

// DOM elements
const gridContainer = document.getElementById('grid');
const algoSelect = document.getElementById('algo-select');
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const clearWallsBtn = document.getElementById('clear-walls-btn');
const speedSlider = document.getElementById('speed-slider');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importModal = document.getElementById('import-modal');
const importDataTextarea = document.getElementById('import-data');
const closeImportBtn = document.getElementById('close-import-btn');

// Cell states
const CELL_EMPTY = 'empty';
const CELL_START = 'start';
const CELL_END = 'end';
const CELL_WALL = 'wall';
const CELL_VISITED = 'visited';
const CELL_PATH = 'path';

// Initialize grid data and DOM
function createGrid() {
  gridContainer.innerHTML = '';
  grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(CELL_EMPTY));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridContainer.appendChild(cell);
    }
  }
}

function updateCellClass(row, col, state) {
  const index = row * COLS + col;
  const cell = gridContainer.children[index];
  cell.className = 'cell'; // reset
  if(state && state !== CELL_EMPTY) {
    cell.classList.add(state);
  }
}

// Set start/end/walls on click
function cellClickHandler(e) {
  if (isRunning) return;
  if (!e.target.classList.contains('cell')) return;

  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  const currentState = grid[row][col];

  if (!startNode) {
    startNode = {row, col};
    grid[row][col] = CELL_START;
  } else if (!endNode && !(row === startNode.row && col === startNode.col)) {
    endNode = {row, col};
    grid[row][col] = CELL_END;
  } else if (
    !(row === startNode.row && col === startNode.col) &&
    !(row === endNode.row && col === endNode.col)
  ) {
    // toggle wall
    if(currentState === CELL_WALL) {
      grid[row][col] = CELL_EMPTY;
    } else {
      grid[row][col] = CELL_WALL;
    }
  }
  renderGrid();
}

// Drag walls functionality
function cellMouseDown(e) {
  if (isRunning) return;
  if (!e.target.classList.contains('cell')) return;

  mouseIsPressed = true;
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  const currentState = grid[row][col];

  // Determine add or remove walls drag mode
  currentWallAction = currentState === CELL_WALL ? 'remove' : 'add';
  toggleWall(row, col);
}

function cellMouseOver(e) {
  if (!mouseIsPressed || isRunning) return;
  if (!e.target.classList.contains('cell')) return;

  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;

  toggleWall(row, col);
}

function toggleWall(row, col) {
  if (
    (startNode && row === startNode.row && col === startNode.col) ||
    (endNode && row === endNode.row && col === endNode.col)
  ) return;

  if(currentWallAction === 'add') {
    grid[row][col] = CELL_WALL;
  } else if(currentWallAction === 'remove') {
    grid[row][col] = CELL_EMPTY;
  }
  updateCellClass(row, col, grid[row][col]);
}

function stopDrag() {
  mouseIsPressed = false;
  currentWallAction = null;
}

// Render the entire grid
function renderGrid() {
  for(let r = 0; r < ROWS; r++) {
    for(let c = 0; c < COLS; c++) {
      updateCellClass(r, c, grid[r][c]);
    }
  }
}

// Clear path and visited but keep start, end, and walls
function clearPathVisited() {
  for(let r = 0; r < ROWS; r++) {
    for(let c = 0; c < COLS; c++) {
      if(grid[r][c] === CELL_VISITED || grid[r][c] === CELL_PATH) {
        grid[r][c] = CELL_EMPTY;
      }
    }
  }
  renderGrid();
}

// Reset entire grid except start/end
function resetGrid() {
  if(isRunning) return;
  clearPathVisited();
  // Remove walls but keep start/end positions
  for(let r = 0; r < ROWS; r++) {
    for(let c = 0; c < COLS; c++) {
      if(grid[r][c] === CELL_WALL) {
        grid[r][c] = CELL_EMPTY;
      }
    }
  }
  startNode = null;
  endNode = null;
  createGrid();
}

// Delay utility
const delay = ms => new Promise(res => setTimeout(res, ms));

// Neighbors helper
function getNeighbors(r, c) {
  const neighbors = [];
  if(r > 0) neighbors.push([r-1, c]);
  if(r < ROWS - 1) neighbors.push([r+1, c]);
  if(c > 0) neighbors.push([r, c-1]);
  if(c < COLS - 1) neighbors.push([r, c+1]);
  return neighbors;
}

// Reconstruct path from cameFrom map
async function reconstructPath(cameFrom, current) {
  let path = [];
  while(current) {
    path.push(current);
    current = cameFrom[coordKey(current)];
  }
  path.reverse();
  for(const [r,c] of path) {
    if(grid[r][c] !== CELL_START && grid[r][c] !== CELL_END) {
      grid[r][c] = CELL_PATH;
      updateCellClass(r, c, CELL_PATH);
      await delay(animationSpeed);
    }
  }
}

// Utilities for map keys
function coordKey([r,c]) {
  return r + ',' + c;
}

// BFS implementation
async function bfs() {
  if(!startNode || !endNode) return;
  
  const queue = [];
  const visited = new Set();
  const cameFrom = {};

  queue.push([startNode.row, startNode.col]);
  visited.add(coordKey([startNode.row, startNode.col]));

  while(queue.length) {
    const [r,c] = queue.shift();

    if(r === endNode.row && c === endNode.col) {
      await reconstructPath(cameFrom, [r,c]);
      return;
    }

    for(const [nr,nc] of getNeighbors(r,c)) {
      if(visited.has(coordKey([nr,nc]))) continue;
      if(grid[nr][nc] === CELL_WALL) continue;

      visited.add(coordKey([nr,nc]));
      cameFrom[coordKey([nr,nc])] = [r,c];

      if(grid[nr][nc] !== CELL_END) {
        grid[nr][nc] = CELL_VISITED;
        updateCellClass(nr, nc, CELL_VISITED);
      }
      await delay(animationSpeed);
      queue.push([nr,nc]);
    }
  }
}

// DFS implementation
async function dfs() {
  if(!startNode || !endNode) return;

  const stack = [];
  const visited = new Set();
  const cameFrom = {};

  stack.push([startNode.row, startNode.col]);

  while(stack.length) {
    const [r,c] = stack.pop();

    if(visited.has(coordKey([r,c]))) continue;
    visited.add(coordKey([r,c]));

    if(r === endNode.row && c === endNode.col) {
      await reconstructPath(cameFrom, [r,c]);
      return;
    }

    if(grid[r][c] !== CELL_START) {
      grid[r][c] = CELL_VISITED;
      updateCellClass(r, c, CELL_VISITED);
      await delay(animationSpeed);
    }

    const neighbors = getNeighbors(r, c);
    for(const [nr,nc] of neighbors) {
      if(visited.has(coordKey([nr,nc]))) continue;
      if(grid[nr][nc] === CELL_WALL) continue;

      cameFrom[coordKey([nr,nc])] = [r,c];
      stack.push([nr,nc]);
    }
  }
}

// Dijkstra's algorithm implementation
async function dijkstra() {
  if(!startNode || !endNode) return;

  const dist = Array(ROWS).fill(null).map(() => Array(COLS).fill(Infinity));
  const visited = new Set();
  const cameFrom = {};
  dist[startNode.row][startNode.col] = 0;

  // Min priority queue with array and sort (inefficient but simple)
  const pq = [[0, [startNode.row, startNode.col]]];

  while(pq.length) {
    pq.sort((a,b) => a[0] - b[0]);
    const [currentDist, [r,c]] = pq.shift();

    if(visited.has(coordKey([r,c]))) continue;
    visited.add(coordKey([r,c]));

    if(r === endNode.row && c === endNode.col) {
      await reconstructPath(cameFrom, [r,c]);
      return;
    }

    if(grid[r][c] !== CELL_START) {
      grid[r][c] = CELL_VISITED;
      updateCellClass(r, c, CELL_VISITED);
      await delay(animationSpeed);
    }

    for(const [nr,nc] of getNeighbors(r,c)) {
      if(visited.has(coordKey([nr,nc])) || grid[nr][nc] === CELL_WALL) continue;

      const newDist = currentDist + 1; // uniform cost
      if(newDist < dist[nr][nc]) {
        dist[nr][nc] = newDist;
        cameFrom[coordKey([nr,nc])] = [r,c];
        pq.push([newDist, [nr,nc]]);
      }
    }
  }
}

// A* implementation
function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

async function astar() {
  if(!startNode || !endNode) return;

  const openSet = new Set();
  const cameFrom = {};
  const gScore = Array(ROWS).fill(null).map(() => Array(COLS).fill(Infinity));
  const fScore = Array(ROWS).fill(null).map(() => Array(COLS).fill(Infinity));

  gScore[startNode.row][startNode.col] = 0;
  fScore[startNode.row][startNode.col] = heuristic([startNode.row, startNode.col], [endNode.row, endNode.col]);

  openSet.add(coordKey([startNode.row, startNode.col]));

  while(openSet.size) {
    // Find node in openSet with lowest fScore
    let currentKey = null;
    let lowestF = Infinity;
    for(let nodeKey of openSet) {
      const [r,c] = nodeKey.split(',').map(Number);
      if(fScore[r][c] < lowestF) {
        lowestF = fScore[r][c];
        currentKey = nodeKey;
      }
    }

    const [r, c] = currentKey.split(',').map(Number);
    if(r === endNode.row && c === endNode.col) {
      await reconstructPath(cameFrom, [r,c]);
      return;
    }

    openSet.delete(currentKey);
    if(grid[r][c] !== CELL_START) {
      grid[r][c] = CELL_VISITED;
      updateCellClass(r, c, CELL_VISITED);
      await delay(animationSpeed);
    }

    for(const [nr,nc] of getNeighbors(r,c)) {
      if(grid[nr][nc] === CELL_WALL) continue;

      const tentativeG = gScore[r][c] + 1;
      if(tentativeG < gScore[nr][nc]) {
        cameFrom[coordKey([nr,nc])] = [r,c];
        gScore[nr][nc] = tentativeG;
        fScore[nr][nc] = tentativeG + heuristic([nr,nc], [endNode.row, endNode.col]);
        openSet.add(coordKey([nr,nc]));
      }
    }
  }
}

// Run selected algorithm
async function runAlgorithm() {
  if(isRunning) return;
  if(!startNode || !endNode) {
    alert('Please set both start and end nodes.');
    return;
  }
  isRunning = true;
  clearPathVisited();

  const algo = algoSelect.value;
  switch(algo) {
    case 'bfs':
      await bfs();
      break;
    case 'dfs':
      await dfs();
      break;
    case 'dijkstra':
      await dijkstra();
      break;
    case 'astar':
      await astar();
      break;
  }
  isRunning = false;
}

// Clear walls only
function clearWalls() {
  if(isRunning) return;

  for(let r = 0; r < ROWS; r++) {
    for(let c = 0; c < COLS; c++) {
      if(grid[r][c] === CELL_WALL) {
        grid[r][c] = CELL_EMPTY;
      }
    }
  }
  renderGrid();
}

// Theme toggle
function toggleTheme() {
  document.body.classList.toggle('dark');
}

// Export grid layout as JSON string
function exportGrid() {
  const layout = {
    startNode,
    endNode,
    walls: [],
  };
  for(let r = 0; r < ROWS; r++) {
    for(let c = 0; c < COLS; c++) {
      if(grid[r][c] === CELL_WALL) layout.walls.push([r,c]);
    }
  }
  const json = JSON.stringify(layout);
  navigator.clipboard.writeText(json)
    .then(() => alert('Grid layout copied to clipboard!'))
    .catch(() => alert('Failed to copy grid layout.'));
}

// Import grid layout from user input
function importGrid() {
  importModal.style.display = 'block';
  importDataTextarea.value = '';
}

function closeImport() {
  importModal.style.display = 'none';
}

function loadGridFromJSON(jsonStr) {
  try {
    const layout = JSON.parse(jsonStr);
    if (!layout.startNode || !layout.endNode) throw new Error('Invalid layout');
    // Reset grid
    for(let r=0; r<ROWS; r++) {
      for(let c=0; c<COLS; c++) {
        grid[r][c] = CELL_EMPTY;
      }
    }
    startNode = layout.startNode;
    endNode = layout.endNode;

    for(const [r,c] of layout.walls) {
      grid[r][c] = CELL_WALL;
    }

    // Set start and end
    grid[startNode.row][startNode.col] = CELL_START;
    grid[endNode.row][endNode.col] = CELL_END;

    renderGrid();
    closeImport();
  } catch(e) {
    alert('Invalid grid layout JSON!');
  }
}

// Event listeners
gridContainer.addEventListener('click', cellClickHandler);
gridContainer.addEventListener('mousedown', cellMouseDown);
gridContainer.addEventListener('mouseover', cellMouseOver);
window.addEventListener('mouseup', stopDrag);

runBtn.addEventListener('click', runAlgorithm);
resetBtn.addEventListener('click', () => {
  if(isRunning) return;
  startNode = null;
  endNode = null;
  createGrid();
});
clearWallsBtn.addEventListener('click', clearWalls);
speedSlider.addEventListener('input', e => {
  animationSpeed = +e.target.value;
});
themeToggleBtn.addEventListener('click', toggleTheme);
exportBtn.addEventListener('click', exportGrid);
importBtn.addEventListener('click', importGrid);
closeImportBtn.addEventListener('click', closeImport);
importDataTextarea.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && e.ctrlKey) {
    loadGridFromJSON(importDataTextarea.value);
  }
});

// Initialize on page load
createGrid();

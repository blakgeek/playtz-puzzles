const fs = require('fs');
const path = require('path');
const { decode, encode } = require('@msgpack/msgpack');

const MAX_WINDOW = 7;

// Paths
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'daily', 'manifest.json');
const puzzlesDir = path.join(repoRoot, 'daily', 'puzzles');
const outputPath = path.join(repoRoot, 'daily.pl8');

// Read manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const { puzzles, epoch } = manifest;

if (!puzzles || puzzles.length === 0) {
    console.log('No puzzles in manifest, skipping rotation');
    process.exit(0);
}

// Calculate days since epoch
const epochDate = new Date(epoch + 'T00:00:00Z');
const today = new Date().toISOString().split('T')[0];
const currentDate = new Date(today + 'T00:00:00Z');
const daysSinceEpoch = Math.floor((currentDate - epochDate) / (1000 * 60 * 60 * 24));

console.log(`Epoch: ${epoch}, Today: ${today}, Days since epoch: ${daysSinceEpoch}`);

// Before epoch: no puzzles
if (daysSinceEpoch < 0) {
    console.log('Before epoch, generating empty daily pack');
    const emptyPack = { id: 'daily', title: 'Daily Puzzles', puzzles: [] };
    fs.writeFileSync(outputPath, Buffer.from(encode(emptyPack)));
    process.exit(0);
}

// Calculate window bounds
const currentDayIndex = Math.min(daysSinceEpoch, puzzles.length - 1);
const windowSize = Math.min(currentDayIndex + 1, MAX_WINDOW);
const startIndex = Math.max(0, currentDayIndex - windowSize + 1);

console.log(`Window: puzzles[${startIndex}] to puzzles[${currentDayIndex}] (${windowSize} puzzles)`);

// Helper to format date
function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Build output with dated puzzles
const dailyPuzzles = [];
for (let i = startIndex; i <= currentDayIndex; i++) {
    const puzzleInfo = puzzles[i];
    const puzzlePath = path.join(puzzlesDir, puzzleInfo.id + '.pl8');

    if (!fs.existsSync(puzzlePath)) {
        console.warn(`Puzzle file not found: ${puzzlePath}`);
        continue;
    }

    const buffer = fs.readFileSync(puzzlePath);
    const puzzleData = decode(buffer);

    const puzzleDate = new Date(epochDate);
    puzzleDate.setUTCDate(puzzleDate.getUTCDate() + i);

    dailyPuzzles.push({
        ...puzzleData,
        t: formatDate(puzzleDate),
        date: puzzleDate.toISOString().split('T')[0]
    });
}

// Write output
const dailyPack = {
    id: 'daily',
    title: 'Daily Puzzles',
    puzzles: dailyPuzzles
};

fs.writeFileSync(outputPath, Buffer.from(encode(dailyPack)));
console.log(`Generated daily.pl8 with ${dailyPuzzles.length} puzzles`);

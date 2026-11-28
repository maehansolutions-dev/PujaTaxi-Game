import {
  ALLEY_LENGTH,
  ALLEY_WIDTH,
  COLLEGE_CROSSING_Z,
  COLLEGE_MERGE_Z,
  COLLEGE_STREET_WIDTH,
  COLLEGE_STREET_X,
  COLLEGE_TURN_Z,
  CROSS_STREET_LENGTH,
  CROSS_STREET_WIDTH,
  EDEN_X,
  EDEN_Z,
  GANGA_NORTH_BANK_Z,
  GANGA_SOUTH_BANK_Z,
  HOWRAH_BRIDGE_END_Z,
  HOWRAH_BRIDGE_START_Z,
  HOWRAH_BRIDGE_Z,
  NETAJI_CROSSING_Z,
  ROAD_ALLEY_OFFSET,
  ROAD_BLOCK_SPACING,
  STPAUL_X,
  STPAUL_Z,
  VICTORIA_PLAZA_Z,
  VICTORIA_ROAD_WIDTH,
  VICTORIA_ROAD_X,
  VICTORIA_TURN_Z,
  collegeStreetCenterX,
  roadCenterX,
} from './roadLayout.js';

const money = (value) => Number(value || 0).toFixed(2);

export function createHud(config, onCredit = () => {}) {
  const el = (id) => document.getElementById(id);
  const wallet = el('walletNum') || el('walletValue');
  const walletNote = el('walletNote');
  const walletCard = wallet?.closest('.wallet-card');
  const remaining = el('distRemaining');
  const status = el('tripStatus');
  const card = el('passengerCard');
  const kicker = card?.querySelector('.passenger-kicker');
  const passengerName = el('passengerName');
  const destination = el('passengerDestination');
  const quote = el('passengerQuote');
  const fare = el('fareNum') || el('fareValue');
  const fareLabel = el('fareLabel');
  const fareCard = fare?.closest('.fare-card');
  const map = el('minimap');
  const ctx = map?.getContext('2d');
  const bigMap = el('bigMapCanvas');
  const bigCtx = bigMap?.getContext('2d');
  const bigModal = el('bigMapModal');
  const bigSubtitle = el('bigMapSubtitle');
  let previousWallet = null;

  function buildGreenRoute(playerX, playerZ, trip) {
    if (!trip) return [];
    const pts = [{ x: playerX, z: playerZ }];
    const destOnVictoria = Math.abs(trip.x - VICTORIA_ROAD_X) < 16 && trip.z <= VICTORIA_TURN_Z;
    const playerOnSideX = Math.abs(playerX - roadCenterX(playerZ)) > 14;

    if (destOnVictoria) {
      if (Math.abs(playerX - VICTORIA_ROAD_X) < 14 && playerZ <= VICTORIA_TURN_Z) {
        pts.push({ x: VICTORIA_ROAD_X, z: playerZ }, { x: trip.x, z: trip.z });
      } else {
        if (Math.abs(playerZ - VICTORIA_TURN_Z) > 10) {
          if (playerOnSideX) pts.push({ x: roadCenterX(playerZ), z: playerZ });
          const step = playerZ > VICTORIA_TURN_Z ? -12 : 12;
          for (let z = playerZ; step < 0 ? z >= VICTORIA_TURN_Z : z <= VICTORIA_TURN_Z; z += step) {
            pts.push({ x: roadCenterX(z), z });
          }
          pts.push({ x: roadCenterX(VICTORIA_TURN_Z), z: VICTORIA_TURN_Z });
        }
        pts.push({ x: VICTORIA_ROAD_X, z: VICTORIA_TURN_Z }, { x: trip.x, z: trip.z });
      }
      return pts;
    }

    if (playerOnSideX) {
      const exitZ = Math.abs(playerZ - VICTORIA_TURN_Z) < 16 ? VICTORIA_TURN_Z : playerZ;
      pts.push({ x: roadCenterX(exitZ), z: exitZ });
    }
    const startZ = pts[pts.length - 1].z;
    const step = startZ > trip.z ? -12 : 12;
    for (let z = startZ; step < 0 ? z >= trip.z : z <= trip.z; z += step) {
      pts.push({ x: roadCenterX(z), z });
    }
    pts.push({ x: trip.x, z: trip.z });
    return pts;
  }

  function renderMapCanvas(targetCtx, targetCanvas, playerX, playerZ, heading, snap, scale, showLabels) {
    if (!targetCtx || !targetCanvas) return;
    const w = targetCanvas.width, h = targetCanvas.height;
    const cx = w / 2, cy = h / 2;
    const onTrip = Boolean(snap.trip);

    targetCtx.clearRect(0, 0, w, h);
    targetCtx.fillStyle = '#141f23';
    targetCtx.fillRect(0, 0, w, h);

    const drawCurvedBand = (halfW, fill) => {
      targetCtx.fillStyle = fill;
      targetCtx.beginPath();
      for (let y = 0; y <= h; y += 6) {
        const worldZ = playerZ + (y - cy) / scale;
        const rx = cx + (roadCenterX(worldZ) - playerX) * scale;
        if (y === 0) targetCtx.moveTo(rx - halfW, y);
        else targetCtx.lineTo(rx - halfW, y);
      }
      for (let y = h; y >= 0; y -= 6) {
        const worldZ = playerZ + (y - cy) / scale;
        const rx = cx + (roadCenterX(worldZ) - playerX) * scale;
        targetCtx.lineTo(rx + halfW, y);
      }
      targetCtx.closePath();
      targetCtx.fill();
    };
    drawCurvedBand(12 * scale, '#514c43');
    drawCurvedBand(9 * scale, '#77776b');
    targetCtx.strokeStyle = 'rgba(239,220,160,.55)';
    targetCtx.lineWidth = Math.max(1.2, 2 * scale);
    targetCtx.setLineDash([7, 8]);
    targetCtx.beginPath();
    for (let y = 0; y <= h; y += 6) {
      const worldZ = playerZ + (y - cy) / scale;
      const rx = cx + (roadCenterX(worldZ) - playerX) * scale;
      if (y === 0) targetCtx.moveTo(rx, y);
      else targetCtx.lineTo(rx, y);
    }
    targetCtx.stroke();
    targetCtx.setLineDash([]);

    // Cross streets & alleys
    const firstBlock = Math.floor((playerZ - h / (2 * scale)) / ROAD_BLOCK_SPACING) - 1;
    const lastBlock = Math.ceil((playerZ + h / (2 * scale)) / ROAD_BLOCK_SPACING) + 1;
    for (let b = firstBlock; b <= lastBlock; b++) {
      const bz = b * ROAD_BLOCK_SPACING;
      const cyCross = cy + (bz - playerZ) * scale;
      const cxCross = cx + (roadCenterX(bz) - playerX) * scale;
      targetCtx.fillStyle = '#6a6d65';
      targetCtx.fillRect(cxCross - (CROSS_STREET_LENGTH / 2) * scale, cyCross - (CROSS_STREET_WIDTH / 2) * scale, CROSS_STREET_LENGTH * scale, CROSS_STREET_WIDTH * scale);

      const az = bz - ROAD_ALLEY_OFFSET;
      const cyAlley = cy + (az - playerZ) * scale;
      const cxAlley = cx + (roadCenterX(az) - playerX) * scale;
      targetCtx.fillStyle = '#585c56';
      targetCtx.fillRect(cxAlley - (ALLEY_LENGTH / 2) * scale, cyAlley - (ALLEY_WIDTH / 2) * scale, ALLEY_LENGTH * scale, ALLEY_WIDTH * scale);
    }

    // Victoria Road & Memorial Garden
    const vRoadX = cx + (VICTORIA_ROAD_X - playerX) * scale;
    const vTopY = cy + (VICTORIA_PLAZA_Z - playerZ) * scale;
    const vBotY = cy + (VICTORIA_TURN_Z - playerZ) * scale;
    targetCtx.fillStyle = '#7b8075';
    targetCtx.fillRect(vRoadX - (VICTORIA_ROAD_WIDTH / 2) * scale, vTopY, VICTORIA_ROAD_WIDTH * scale, vBotY - vTopY);
    targetCtx.fillStyle = '#2d5c33';
    targetCtx.fillRect(vRoadX - 28 * scale, vTopY - 46 * scale, 56 * scale, 42 * scale);
    targetCtx.fillStyle = '#f5eedc';
    targetCtx.beginPath();
    targetCtx.arc(vRoadX, vTopY - 24 * scale, Math.max(3, 8 * scale), 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.strokeStyle = '#d4af37';
    targetCtx.lineWidth = 1.5;
    targetCtx.stroke();

    // College Street corridor (curves past Coffee House back to main road)
    const cRoadX = cx + (COLLEGE_STREET_X - playerX) * scale;
    const cBotY = cy + (COLLEGE_TURN_Z - playerZ) * scale;
    targetCtx.save();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.strokeStyle = '#73766e';
    targetCtx.lineWidth = Math.max(4, COLLEGE_STREET_WIDTH * scale);
    targetCtx.beginPath();
    for (let z = COLLEGE_TURN_Z; z >= COLLEGE_MERGE_Z; z -= 8) {
      const mx = cx + (collegeStreetCenterX(z) - playerX) * scale;
      const my = cy + (z - playerZ) * scale;
      if (z === COLLEGE_TURN_Z) targetCtx.moveTo(mx, my);
      else targetCtx.lineTo(mx, my);
    }
    targetCtx.stroke();

    targetCtx.strokeStyle = '#c89b54';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    for (let z = COLLEGE_TURN_Z; z >= COLLEGE_MERGE_Z + 12; z -= 8) {
      const mx = cx + (collegeStreetCenterX(z) - playerX) * scale;
      const my = cy + (z - playerZ) * scale;
      if (z === COLLEGE_TURN_Z) targetCtx.moveTo(mx, my);
      else targetCtx.lineTo(mx, my);
    }
    targetCtx.stroke();
    targetCtx.restore();

    targetCtx.fillStyle = '#a34b39';
    targetCtx.fillRect(cRoadX - 18 * scale, cy + (-185 - playerZ) * scale, 9 * scale, 24 * scale);
    targetCtx.fillStyle = '#f0ece1';
    targetCtx.fillRect(cRoadX - 18 * scale, cy + (-240 - playerZ) * scale, 9 * scale, 20 * scale);
    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(cRoadX - 24 * scale, cy + (-300 - playerZ) * scale, 14 * scale, 34 * scale);
    targetCtx.fillStyle = '#d4af37';
    targetCtx.fillRect(cx + (collegeStreetCenterX(-342) - 22 - playerX) * scale, cy + (-348 - playerZ) * scale, 12 * scale, 12 * scale);

    // Netaji statue pedestal roundabout at z = -240 crossing
    const netX = cx + (roadCenterX(NETAJI_CROSSING_Z) - playerX) * scale;
    const netY = cy + (NETAJI_CROSSING_Z - playerZ) * scale;
    targetCtx.fillStyle = '#f4f1ea';
    targetCtx.beginPath();
    targetCtx.arc(netX, netY, Math.max(2.5, 4.5 * scale), 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.strokeStyle = '#d4af37';
    targetCtx.lineWidth = 1.2;
    targetCtx.stroke();

    // Eden Gardens Stadium enclosed block & East Perimeter Road
    const eX = cx + (72 - playerX) * scale;
    const eY = cy + (EDEN_Z - playerZ) * scale;
    targetCtx.fillStyle = '#6a6d65';
    targetCtx.fillRect(cx + (126 - 6.5 - playerX) * scale, cy + (-400 - playerZ) * scale, 13 * scale, 80 * scale);
    targetCtx.save();
    targetCtx.translate(eX, eY);
    targetCtx.fillStyle = '#366828';
    targetCtx.fillRect(-46 * scale, -32 * scale, 92 * scale, 64 * scale);
    targetCtx.fillStyle = '#c9c6ba';
    targetCtx.beginPath();
    targetCtx.ellipse(0, 0, Math.max(7, 36 * scale), Math.max(5, 27 * scale), 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = '#366828';
    targetCtx.beginPath();
    targetCtx.ellipse(0, 0, Math.max(4, 24 * scale), Math.max(3, 17 * scale), 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();

    // St. Paul's Cathedral compound on west side at (STPAUL_X, STPAUL_Z)
    const sX = cx + (STPAUL_X - playerX) * scale;
    const sY = cy + (STPAUL_Z - playerZ) * scale;
    targetCtx.fillStyle = '#3a6e2b';
    targetCtx.fillRect(sX - 34 * scale, sY - 32 * scale, 68 * scale, 64 * scale);
    targetCtx.fillStyle = '#f4f1e8';
    targetCtx.fillRect(sX - 18 * scale, sY - 20 * scale, 30 * scale, 40 * scale);
    targetCtx.strokeStyle = '#d4af37';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(sX - 18 * scale, sY - 20 * scale, 30 * scale, 40 * scale);

    if (showLabels) {
      targetCtx.font = '600 11px "DM Mono", monospace';
      targetCtx.fillStyle = '#f7edd2';
      targetCtx.textAlign = 'center';
      targetCtx.fillText('VICTORIA MEMORIAL', vRoadX, vTopY - 52 * scale);
      targetCtx.fillText('EDEN GARDENS', eX, eY - 40 * scale);
      targetCtx.fillText("ST. PAUL'S CATHEDRAL", sX, sY - 38 * scale);
      targetCtx.fillText('NETAJI STATUE', netX, netY - 12);
      targetCtx.fillText('COLLEGE STREET', cRoadX, cBotY + 18);
      targetCtx.fillStyle = '#d9b5a6';
      targetCtx.fillText('MEDICAL COLLEGE', cRoadX - 68, cy + (-168 - playerZ) * scale);
      targetCtx.fillStyle = '#e5e2d7';
      targetCtx.fillText('CALCUTTA UNIV.', cRoadX - 66, cy + (-228 - playerZ) * scale);
      targetCtx.fillStyle = '#ffffff';
      targetCtx.fillText('PRESIDENCY UNIV.', cRoadX - 72, cy + (-282 - playerZ) * scale);
      targetCtx.fillStyle = '#f5d78c';
      targetCtx.fillText('COFFEE HOUSE', cx + (collegeStreetCenterX(-342) - 58 - playerX) * scale, cy + (-342 - playerZ) * scale);
    }

    const point = (p) => ({ x: cx + (p.x - playerX) * scale, y: cy + (p.z - playerZ) * scale });

    // Ganga River (blue ONLY on the map!) + Howrah Bridge crossing
    const gTopY = cy + (GANGA_NORTH_BANK_Z - playerZ) * scale;
    const gBotY = cy + (GANGA_SOUTH_BANK_Z - playerZ) * scale;
    targetCtx.fillStyle = '#2563a6';
    targetCtx.fillRect(0, gTopY, w, gBotY - gTopY);
    targetCtx.fillStyle = '#4a85c4';
    targetCtx.fillRect(0, gTopY - 2, w, 2);
    targetCtx.fillRect(0, gBotY, w, 2);

    const bTopY = cy + (HOWRAH_BRIDGE_END_Z - playerZ) * scale;
    const bBotY = cy + (HOWRAH_BRIDGE_START_Z - playerZ) * scale;
    const bX = cx + (0 - playerX) * scale;
    targetCtx.fillStyle = '#8b959e';
    targetCtx.fillRect(bX - 11 * scale, bTopY, 22 * scale, bBotY - bTopY);
    targetCtx.fillStyle = '#4f555b';
    targetCtx.fillRect(bX - 9 * scale, bTopY, 18 * scale, bBotY - bTopY);
    if (showLabels) {
      targetCtx.font = '600 11px "DM Mono", monospace';
      targetCtx.textAlign = 'center';
      targetCtx.fillStyle = '#bae0ff';
      targetCtx.fillText('GANGA RIVER', bX - 95 * scale, cy + (HOWRAH_BRIDGE_Z - playerZ) * scale);
      targetCtx.fillStyle = '#f7edd2';
      targetCtx.fillText('HOWRAH BRIDGE', bX + 75 * scale, cy + (HOWRAH_BRIDGE_Z - playerZ) * scale);
    }

    // Green GPS route along the road when a passenger is on board
    if (onTrip && snap.destination) {
      const routePts = buildGreenRoute(playerX, playerZ, snap.trip);
      if (routePts.length >= 2) {
        targetCtx.save();
        targetCtx.strokeStyle = 'rgba(68, 213, 139, 0.36)';
        targetCtx.lineWidth = Math.max(6, 12 * scale);
        targetCtx.lineCap = 'round';
        targetCtx.lineJoin = 'round';
        targetCtx.beginPath();
        routePts.forEach((rp, idx) => {
          const q = point(rp);
          if (idx === 0) targetCtx.moveTo(q.x, q.y);
          else targetCtx.lineTo(q.x, q.y);
        });
        targetCtx.stroke();

        targetCtx.strokeStyle = '#44d58b';
        targetCtx.lineWidth = Math.max(2.5, 5 * scale);
        targetCtx.stroke();
        targetCtx.restore();
      }
    }

    const drawDot = (p, color, radius) => {
      const q = point(p);
      if (!showLabels && (q.x < -8 || q.x > w + 8 || q.y < -8 || q.y > h + 8)) return;
      targetCtx.fillStyle = color;
      targetCtx.beginPath();
      targetCtx.arc(q.x, q.y, radius, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = 'rgba(255,255,255,.85)';
      targetCtx.lineWidth = 1.5;
      targetCtx.stroke();
    };
    if (snap.pickup) drawDot(snap.pickup, '#ffd04b', showLabels ? 6 : 4.5);
    if (snap.destination) drawDot(snap.destination, '#44d58b', showLabels ? 7 : 5);

    // Car location arrow: yellow by default, green when passenger is on board
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate(-heading);
    const arrowScale = showLabels ? 1.45 : 1;
    targetCtx.fillStyle = onTrip ? '#44d58b' : '#f4c343';
    targetCtx.strokeStyle = '#12181a';
    targetCtx.lineWidth = 2;
    targetCtx.beginPath();
    targetCtx.moveTo(0, -8 * arrowScale);
    targetCtx.lineTo(-5.5 * arrowScale, 6 * arrowScale);
    targetCtx.lineTo(0, 2.5 * arrowScale);
    targetCtx.lineTo(5.5 * arrowScale, 6 * arrowScale);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.restore();

    targetCtx.strokeStyle = 'rgba(234,239,226,.17)';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  function drawMap(playerX, playerZ, snap, heading = 0) {
    renderMapCanvas(ctx, map, playerX, playerZ, heading, snap, Math.min(map?.width || 120, map?.height || 120) / 360, false);
    if (bigModal && !bigModal.hidden) {
      if (bigSubtitle) {
        bigSubtitle.textContent = snap.trip
          ? `GREEN ROUTE TO ${snap.trip.destination.toUpperCase()}`
          : 'YELLOW ARROW: YOUR CAB · CLICK OR PRESS M TO CLOSE';
      }
      renderMapCanvas(bigCtx, bigMap, playerX, playerZ, heading, snap, 1.32, true);
    }
  }

  function update(snapshot, playerX, playerZ, heading = 0) {
    if (wallet) wallet.textContent = money(snapshot.wallet);
    if (walletNote) walletNote.textContent = snapshot.trip ? 'FARE ADDED AT DROP-OFF' : 'FARES CREDITED ON DROP-OFF';
    if (previousWallet !== null && snapshot.wallet > previousWallet) {
      walletCard?.classList.remove('is-credit');
      void walletCard?.offsetWidth;
      walletCard?.classList.add('is-credit');
      onCredit(snapshot.wallet - previousWallet);
    }
    previousWallet = snapshot.wallet;
    if (status) {
      status.textContent = snapshot.status;
      status.title = snapshot.status;
    }
    if (remaining) remaining.textContent = snapshot.trip ? `${(snapshot.trip.remaining / config.worldUnitsPerGameMetre).toFixed(1)} m` : snapshot.passenger ? 'ON FOOTPATH' : '-- m';
    if (card) card.hidden = !(snapshot.passenger || snapshot.trip);
    const active = snapshot.trip || snapshot.passenger;
    if (active) {
      if (passengerName) passengerName.textContent = snapshot.trip ? 'PASSENGER ON BOARD' : snapshot.passenger.name.toUpperCase();
      if (destination) destination.textContent = snapshot.trip ? snapshot.trip.destination.toUpperCase() : 'PICKUP POINT';
      if (quote) quote.textContent = snapshot.trip ? 'Trip in progress. Stop near the destination marker to complete the fare.' : `“${snapshot.passenger.quote}”`;
      if (kicker) kicker.textContent = snapshot.trip ? 'FARE IN PROGRESS · DESTINATION' : 'FARE REQUEST · KOLKATA';
    }
    if (fare) fare.textContent = money(snapshot.trip?.fare || 0);
    if (fareLabel) fareLabel.textContent = snapshot.trip ? 'FARE DUE ON DROP-OFF' : 'CALCUTTA TAXI FARE METER';
    fareCard?.classList.toggle('is-active', Boolean(snapshot.trip));
    drawMap(playerX, playerZ, snapshot, heading);
  }
  return { update };
}

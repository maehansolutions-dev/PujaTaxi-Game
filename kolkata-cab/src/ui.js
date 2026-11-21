const money = (value) => `\u20b9 ${Number(value || 0).toFixed(2)}`;

export function createHud(config, onCredit = () => {}) {
  const el = (id) => document.getElementById(id);
  const wallet = el('walletValue');
  const walletNote = el('walletNote');
  const walletCard = wallet?.closest('.wallet-card');
  const remaining = el('distRemaining');
  const status = el('tripStatus');
  const card = el('passengerCard');
  const kicker = card?.querySelector('.passenger-kicker');
  const passengerName = el('passengerName');
  const destination = el('passengerDestination');
  const quote = el('passengerQuote');
  const fare = el('fareValue');
  const fareLabel = el('fareLabel');
  const fareCard = fare?.closest('.fare-card');
  const map = el('minimap');
  const ctx = map?.getContext('2d');
  let previousWallet = null;

  function drawMap(playerX, playerZ, snap) {
    if (!ctx || !map) return;
    const w = map.width, h = map.height, cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) / 360;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#172326'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#514c43'; ctx.fillRect(cx - 12 * scale, 0, 24 * scale, h);
    ctx.fillStyle = '#77776b'; ctx.fillRect(cx - 9 * scale, 0, 18 * scale, h);
    ctx.strokeStyle = 'rgba(239,220,160,.6)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 8]); ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke(); ctx.setLineDash([]);
    const point = (p) => ({ x: cx + (p.x - playerX) * scale, y: cy + (p.z - playerZ) * scale });
    const drawDot = (p, color, radius) => {
      const q = point(p);
      if (q.x < -8 || q.x > w + 8 || q.y < -8 || q.y > h + 8) return;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(q.x, q.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
    };
    if (snap.pickup) drawDot(snap.pickup, '#ffd04b', 4.5);
    if (snap.destination) drawDot(snap.destination, '#55dfb1', 4.5);
    ctx.fillStyle = '#f4c343'; ctx.strokeStyle = '#201a11'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx + 5, cy + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(234,239,226,.17)'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
  }

  function update(snapshot, playerX, playerZ) {
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
    drawMap(playerX, playerZ, snapshot);
  }
  return { update };
}

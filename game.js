(() => {
  'use strict';

  const SEASONS = [
    { name: 'Spring', copy: 'Happy little crops for spring.', weather: 'Clear skies', icon: '☀', crops: [
      { id: 'turnip', name: 'Turnip', icon: '🥬', seed: 12, value: 24, days: 2, yield: 1 },
      { id: 'strawberry', name: 'Berry', icon: '🍓', seed: 24, value: 43, days: 3, yield: 1 },
      { id: 'tulip', name: 'Tulip', icon: '🌷', seed: 18, value: 34, days: 2, yield: 1 }
    ] },
    { name: 'Summer', copy: 'Sunshine brings the sweetest things.', weather: 'Golden sunshine', icon: '☀', crops: [
      { id: 'tomato', name: 'Tomato', icon: '🍅', seed: 15, value: 29, days: 2, yield: 1 },
      { id: 'blueberry', name: 'Blueberry', icon: '🫐', seed: 25, value: 42, days: 3, yield: 1 },
      { id: 'sunflower', name: 'Sunflower', icon: '🌻', seed: 20, value: 39, days: 2, yield: 1 }
    ] },
    { name: 'Autumn', copy: 'A crisp breeze and a golden harvest.', weather: 'Breezy & bright', icon: '🍂', crops: [
      { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', seed: 24, value: 52, days: 3, yield: 1 },
      { id: 'carrot', name: 'Carrot', icon: '🥕', seed: 13, value: 26, days: 2, yield: 1 },
      { id: 'cranberry', name: 'Cranberry', icon: '🫐', seed: 19, value: 36, days: 2, yield: 1 }
    ] },
    { name: 'Winter', copy: 'Cozy winter greens for your windowsill.', weather: 'Soft snow flurries', icon: '❄', crops: [
      { id: 'cabbage', name: 'Cabbage', icon: '🥬', seed: 15, value: 30, days: 2, yield: 1 },
      { id: 'snowberry', name: 'Snowberry', icon: '🫐', seed: 23, value: 44, days: 3, yield: 1 },
      { id: 'holly', name: 'Holly', icon: '🌿', seed: 17, value: 33, days: 2, yield: 1 }
    ] }
  ];
  const TOOLS = [
    { id: 'hoe', label: 'Hoe', icon: '⛏️', cost: 'FREE' },
    { id: 'plant', label: 'Plant', icon: '🌱', cost: '' },
    { id: 'water', label: 'Water', icon: '💧', cost: 'FREE' },
    { id: 'harvest', label: 'Harvest', icon: '🧺', cost: '' },
    { id: 'clear', label: 'Clear', icon: '🪴', cost: '' }
  ];
  const freshState = () => ({ day: 1, season: 0, gold: 90, energy: 100, selectedTool: 'hoe', selectedSeed: 'turnip', seeds: { turnip: 3 }, plots: Array.from({ length: 9 }, () => ({ tilled: false, crop: null, watered: false })), harvests: 0, actionCount: 0, sound: true, goalDone: false });
  let state;
  try { state = { ...freshState(), ...JSON.parse(localStorage.getItem('little-acre-save') || '{}') }; }
  catch { state = freshState(); }
  if (!Array.isArray(state.plots) || state.plots.length !== 9) state.plots = freshState().plots;
  if (!state.seeds || typeof state.seeds !== 'object') state.seeds = { turnip: 3 };
  state.season = ((Number(state.season) || 0) % SEASONS.length + SEASONS.length) % SEASONS.length;
  state.day = Math.max(1, Math.min(7, Number(state.day) || 1));
  state.gold = Math.max(0, Number(state.gold) || 0);
  state.energy = Math.max(0, Math.min(100, Number(state.energy) || 0));

  const $ = id => document.getElementById(id);
  const garden = $('garden');
  let toastTimer;
  let audioContext;
  const season = () => SEASONS[state.season];
  const seedCount = id => Math.max(0, Number(state.seeds[id]) || 0);
  const cropInfo = id => SEASONS.flatMap(s => s.crops).find(c => c.id === id);
  const save = () => { try { localStorage.setItem('little-acre-save', JSON.stringify(state)); } catch { /* local save unavailable */ } };
  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function sound(freq = 550) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = freq; gain.gain.setValueAtTime(.055, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .13);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .14);
    } catch { /* audio is optional */ }
  }
  function render() {
    const current = season();
    $('dateLabel').textContent = `${current.name} · Day ${state.day}`;
    $('dayStamp').textContent = String(state.day).padStart(2, '0');
    $('seasonTag').textContent = current.name.toUpperCase();
    $('farmScene').dataset.season = current.name.toLowerCase();
    $('weatherIcon').textContent = current.icon;
    $('weatherText').textContent = current.weather;
    $('seasonDay').textContent = `Day ${state.day} of 7`;
    $('seasonProgress').style.width = `${(state.day / 7) * 100}%`;
    $('energyLabel').textContent = `${state.energy} / 100`;
    $('energyBar').style.width = `${state.energy}%`;
    $('energyBar').style.background = state.energy < 25 ? '#d48d72' : '';
    $('goldLabel').innerHTML = `${state.gold} <em>g</em>`;
    $('seasonCopy').textContent = current.copy;
    $('seedCount').textContent = `${Object.values(state.seeds).reduce((a, n) => a + (Number(n) || 0), 0)} seeds`;
    $('harvestTotal').innerHTML = `${state.harvests} <small>crops</small>`;
    $('goalText').textContent = state.goalDone ? 'Your first little crop is in the ground!' : 'Give your first plot some love.';
    $('goalCount').textContent = state.goalDone ? '1/1' : '0/1';
    $('goalProgress').style.width = state.goalDone ? '100%' : '0%';
    $('soundBtn').textContent = state.sound ? '♫' : '♪';
    renderPlots(); renderTools(); renderSeeds();
    $('resetBtn').setAttribute('aria-label', 'Start a new save');
    save();
  }
  function renderPlots() {
    garden.replaceChildren();
    state.plots.forEach((plot, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `plot${plot.tilled ? '' : ' empty'}${plot.watered ? ' watered' : ''}`;
      button.setAttribute('aria-label', plot.crop ? `${cropInfo(plot.crop.id)?.name || 'Crop'}, growth stage ${plot.crop.progress + 1} of ${cropInfo(plot.crop.id)?.days || 2}${plot.crop.progress >= (cropInfo(plot.crop.id)?.days || 2) ? ', ready to harvest' : ''}` : plot.tilled ? `Empty tilled plot ${index + 1}` : `Untilled plot ${index + 1}`);
      if (plot.crop) {
        const info = cropInfo(plot.crop.id) || season().crops[0];
        const stage = Math.min(info.days, plot.crop.progress);
        const plant = document.createElement('span'); plant.className = 'crop-art';
        plant.textContent = stage >= info.days ? info.icon : stage === 0 ? '🌱' : ['🌱', '🌿', '🌾'][Math.min(stage, 2)];
        button.append(plant);
        const label = document.createElement('span'); label.className = 'stage-label'; label.textContent = stage >= info.days ? 'READY!' : `${stage}/${info.days}`; button.append(label);
      }
      if (plot.watered) { const mark = document.createElement('span'); mark.className = 'water-mark'; mark.textContent = '✦'; button.append(mark); }
      button.addEventListener('click', () => useTool(index));
      garden.append(button);
    });
  }
  function renderTools() {
    const toolbar = $('toolbar'); toolbar.replaceChildren();
    TOOLS.forEach(tool => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `tool-card${state.selectedTool === tool.id ? ' active' : ''}`;
      button.setAttribute('aria-pressed', String(state.selectedTool === tool.id));
      button.innerHTML = `${tool.cost ? `<span class="tool-cost">${tool.cost}</span>` : ''}<span class="tool-emoji">${tool.icon}</span><span class="tool-name">${tool.label}</span>`;
      button.addEventListener('click', () => { state.selectedTool = tool.id; sound(460); render(); }); toolbar.append(button);
    });
  }
  function renderSeeds() {
    const list = $('seedList'); list.replaceChildren();
    season().crops.forEach(crop => {
      const row = document.createElement('div'); row.className = 'seed-item';
      const icon = document.createElement('span'); icon.className = 'seed-icon'; icon.textContent = crop.icon;
      const info = document.createElement('span'); info.className = 'seed-info'; info.innerHTML = `<strong>${crop.name} seed</strong><small>${crop.days} days · sells for ${crop.value}g</small>`;
      const price = document.createElement('span'); price.className = 'seed-price'; price.textContent = `${crop.seed}g`;
      const buy = document.createElement('button'); buy.className = 'buy-button'; buy.type = 'button'; buy.textContent = seedCount(crop.id) ? `Have ${seedCount(crop.id)}` : 'Buy'; buy.disabled = state.gold < crop.seed;
      buy.setAttribute('aria-label', `Buy ${crop.name} seed for ${crop.seed} gold`);
      buy.addEventListener('click', () => buySeed(crop)); row.append(icon, info, price, buy); list.append(row);
    });
  }
  function spendEnergy(amount) {
    if (state.energy < amount) { toast('You’re tuckered out. End the day to rest!'); return false; }
    state.energy -= amount; return true;
  }
  function useTool(index) {
    const plot = state.plots[index];
    if (state.selectedTool === 'hoe') {
      if (plot.tilled) return toast('This little plot is already ready.');
      if (!spendEnergy(5)) return;
      plot.tilled = true; toast('A fresh patch, ready for something lovely.');
    } else if (state.selectedTool === 'plant') {
      const id = state.selectedSeed, crop = cropInfo(id);
      if (!crop || !seedCount(id)) return toast('Pick up some seasonal seeds first.');
      if (!plot.tilled) return toast('Give this plot a little hoe first.');
      if (plot.crop) return toast('Something is already growing here.');
      if (!spendEnergy(3)) return;
      state.seeds[id] = seedCount(id) - 1; plot.crop = { id, progress: 0 }; plot.watered = false;
      if (!state.goalDone) state.goalDone = true;
      toast(`${crop.name} seed tucked in. Give it water and time!`); sound(660);
    } else if (state.selectedTool === 'water') {
      if (!plot.crop) return toast('Nothing to water here just yet.');
      if (plot.watered) return toast('This crop is already watered today.');
      if (!spendEnergy(2)) return;
      plot.watered = true; toast('A nice, refreshing drink.');
    } else if (state.selectedTool === 'harvest') {
      if (!plot.crop) return toast('No crop to pick here.');
      const crop = cropInfo(plot.crop.id);
      if (plot.crop.progress < (crop?.days || 2)) return toast('Not quite ripe yet. Let it grow a little longer.');
      const value = crop?.value || 20; state.gold += value; state.harvests += crop?.yield || 1;
      plot.crop = null; plot.tilled = true; plot.watered = false;
      $('coinGain').textContent = `+${value}g`; setTimeout(() => { $('coinGain').textContent = ''; }, 1200);
      toast(`Lovely! ${crop?.name || 'Crop'} sold for ${value}g.`); sound(790);
    } else if (state.selectedTool === 'clear') {
      if (!plot.tilled && !plot.crop) return toast('This patch is already clear.');
      if (!spendEnergy(2)) return;
      plot.crop = null; plot.tilled = false; plot.watered = false; toast('All cleared and ready for a fresh start.');
    }
    state.actionCount += 1; render();
  }
  function buySeed(crop) {
    if (state.gold < crop.seed) return toast('Not quite enough gold for those seeds.');
    state.gold -= crop.seed; state.seeds[crop.id] = seedCount(crop.id) + 1; state.selectedSeed = crop.id; state.selectedTool = 'plant';
    toast(`${crop.name} seed added to your pouch. Tap a plot to plant!`); sound(620); render();
  }
  function sleep() {
    const oldSeason = season().name;
    let grown = 0;
    state.plots.forEach(plot => {
      if (plot.crop && plot.crop.progress < (cropInfo(plot.crop.id)?.days || 2)) {
        // A crop gets a growth day when watered, or when the weather is kind.
        if (plot.watered || (state.day % 3 !== 0 && state.season !== 3)) { plot.crop.progress += 1; grown += 1; }
      }
      plot.watered = false;
    });
    state.day += 1; state.energy = 100;
    let newSeason = false;
    if (state.day > 7) { state.day = 1; state.season = (state.season + 1) % SEASONS.length; newSeason = true; }
    const modalTitle = newSeason ? `Hello, ${season().name.toLowerCase()}!` : 'A day well spent';
    let text = grown ? `${grown} little ${grown === 1 ? 'crop has' : 'crops have'} grown overnight. The morning feels full of possibility.` : 'A good night’s rest. Your energy is back, and there’s a fresh day ahead.';
    if (newSeason) text = `The days have turned from ${oldSeason.toLowerCase()} to ${season().name.toLowerCase()}. ${grown ? `${grown} crops grew overnight, too. ` : ''}A whole new season of possibilities is waiting.`;
    $('modalTitle').textContent = modalTitle; $('modalText').textContent = text;
    $('modal').classList.add('open'); $('modal').setAttribute('aria-hidden', 'false'); render(); sound(520);
  }
  $('sleepBtn').addEventListener('click', sleep);
  $('sleepBtnMobile').addEventListener('click', sleep);
  $('modalClose').addEventListener('click', () => { $('modal').classList.remove('open'); $('modal').setAttribute('aria-hidden', 'true'); render(); });
  $('modal').addEventListener('click', event => { if (event.target === $('modal')) $('modalClose').click(); });
  $('soundBtn').addEventListener('click', () => { state.sound = !state.sound; render(); toast(state.sound ? 'Sound on' : 'Sound off'); });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Start a new farm? Your current save will be replaced.')) return;
    state = freshState(); render(); toast('A fresh little farm, just for you.');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('modal').classList.contains('open')) $('modalClose').click(); });
  render();
})();

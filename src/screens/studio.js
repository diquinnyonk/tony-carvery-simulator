// Recording Studio: record your own sounds and build custom guests with their own voices.
import { SOUND_SLOTS, setRecording, hasRecording, previewSlot, playUrl } from '../audio/voice.js';
import { startRecording, canRecord, MAX_CLIP_MS } from '../audio/recorder.js';
import { putSound, deleteSound, listCharacters, putCharacter, deleteCharacter } from '../storage/db.js';
import { GUEST_TYPES, TYPE_KEYS } from '../game/guestTypes.js';
import { GUEST_LINES, LINE_KINDS, LINE_LABELS } from '../game/lines.js';
import { drawPerson } from '../engine/draw.js';
import { audioContext } from '../audio/sfx.js';

const SKINS = ['#f6d2b8', '#eab894', '#d39a6a', '#b07246', '#8a5530', '#5e3a20'];
const HAIRS = [
  ['#2b1d12', 'Dark'], ['#5a3a1c', 'Brown'], ['#a8742c', 'Auburn'], ['#e0c068', 'Blonde'],
  ['#8c8c8c', 'Grey'], ['#c2452d', 'Ginger'], ['#7e57c2', 'Purple'], ['bald', 'Bald'],
];
const HATS = [['none', 'No hat'], ['cap', 'Baseball cap'], ['tophat', 'Top hat'], ['beanie', 'Bobble hat'], ['crown', 'Crown'], ['party', 'Party hat'], ['chef', 'Chef hat']];
const ACCESSORIES = [['none', 'None'], ['glasses', 'Glasses'], ['shades', 'Sunglasses'], ['monocle', 'Monocle'], ['scarf', 'Football scarf'], ['chain', 'Gold chain'], ['napkin', 'Napkin bib']];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createStudio({ root, soundsEl, charsEl, msgEl, onCharactersChanged }) {
  let active = null; // the recording in progress
  let previewRaf = 0;

  const message = (text) => {
    msgEl.textContent = text;
    msgEl.hidden = !text;
  };

  async function record(button, onBlob) {
    audioContext();
    if (active) {
      active.stop();
      return;
    }
    if (!canRecord()) {
      message('Recording isn\'t available here. Use Upload to add a sound file instead.');
      return;
    }
    message('');
    let rec;
    try {
      rec = await startRecording(MAX_CLIP_MS);
    } catch (err) {
      message(err?.name === 'NotAllowedError'
        ? 'The microphone isn\'t available here. Use Upload instead: record a clip with your phone or computer\'s voice recorder and pick the file.'
        : `Could not start recording: ${err?.message ?? err}. Use Upload to add a sound file instead.`);
      return;
    }
    active = rec;
    const original = button.textContent;
    button.classList.add('recording');
    let left = Math.round(MAX_CLIP_MS / 1000);
    button.textContent = `Stop (${left})`;
    const tick = setInterval(() => {
      left -= 1;
      button.textContent = `Stop (${Math.max(0, left)})`;
    }, 1000);
    const blob = await rec.done;
    clearInterval(tick);
    active = null;
    button.classList.remove('recording');
    button.textContent = original;
    if (blob.size < 500) {
      message('That recording came out empty. Check your microphone and try again.');
      return;
    }
    await onBlob(blob);
  }

  const MAX_UPLOAD = 3 * 1024 * 1024;
  const uploadHtml = '<label class="btn small ghost">Upload<input type="file" accept="audio/*" capture hidden data-a="up"></label>';

  // Use an audio file instead of the microphone (works everywhere, and opens the voice recorder on phones).
  function bindUpload(row, onBlob) {
    const input = row.querySelector('[data-a="up"]');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        message('That file isn\'t a sound. Pick an audio recording such as .m4a, .mp3, .wav or .ogg.');
        return;
      }
      if (file.size > MAX_UPLOAD) {
        message('That sound is too long. Keep clips under about 5 seconds (3 MB).');
        return;
      }
      message('');
      await onBlob(file);
    };
  }

  // ---------- Sounds tab ----------
  function renderSounds() {
    const groups = new Map();
    for (const s of SOUND_SLOTS) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group).push(s);
    }
    soundsEl.innerHTML = '';
    for (const [name, slots] of groups) {
      const g = document.createElement('div');
      g.className = 'slot-group';
      g.innerHTML = `<h3>${esc(name)}</h3>`;
      for (const slot of slots) g.appendChild(slotRow(slot));
      soundsEl.appendChild(g);
    }
  }

  function slotRow(slot) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    const draw = () => {
      const mine = hasRecording(slot.key);
      row.innerHTML = `
        <div class="lbl"><b>${esc(slot.label)}<span class="tag ${mine ? 'mine' : ''}">${mine ? 'Your recording' : 'Default'}</span></b>
        ${slot.text ? `<span>"${esc(slot.text)}"</span>` : ''}</div>
        <div class="slot-actions">
          <button class="btn small rec" data-a="rec">Record</button>
          ${uploadHtml}
          <button class="btn small ghost" data-a="play">Play</button>
          ${mine ? '<button class="btn small ghost" data-a="del">Use default</button>' : ''}
        </div>`;
      const save = async (blob) => {
        await putSound(slot.key, blob);
        setRecording(slot.key, blob);
        draw();
        previewSlot(slot);
      };
      row.querySelector('[data-a="rec"]').onclick = (e) => record(e.currentTarget, save);
      bindUpload(row, save);
      row.querySelector('[data-a="play"]').onclick = () => previewSlot(slot);
      row.querySelector('[data-a="del"]')?.addEventListener('click', async () => {
        await deleteSound(slot.key);
        setRecording(slot.key, null);
        draw();
      });
    };
    draw();
    return row;
  }

  // ---------- Characters tab ----------
  async function renderCharacters() {
    cancelAnimationFrame(previewRaf);
    const chars = await listCharacters().catch(() => []);
    charsEl.innerHTML = `
      <p>Invent your own guests. Pick how they behave, how they look, add a photo for their face and record their voice lines. Ticked characters turn up in Levels 1 to 4.</p>
      <div class="row" style="margin-bottom:14px"><button class="btn gold" data-a="new">+ New character</button></div>
      <div class="char-list"></div>`;
    const list = charsEl.querySelector('.char-list');
    if (!chars.length) list.innerHTML = '<div class="empty-note">No custom guests yet. Make your mates into carvery customers!</div>';
    for (const c of chars) {
      const card = document.createElement('div');
      card.className = 'char-card';
      const cv = document.createElement('canvas');
      cv.width = 220;
      cv.height = 220;
      card.appendChild(cv);
      const recorded = LINE_KINDS.filter((k) => c.lines?.[k]).length;
      card.insertAdjacentHTML('beforeend', `
        <div class="name">${esc(c.name || 'Unnamed')}</div>
        <div class="type">${esc(GUEST_TYPES[c.baseType]?.name ?? 'Regular')} · ${recorded}/${LINE_KINDS.length} lines recorded</div>
        <label><input type="checkbox" ${c.enabled !== false ? 'checked' : ''}> Appears in game</label>
        <div class="slot-actions">
          <button class="btn small ghost" data-a="edit">Edit</button>
          <button class="btn small ghost" data-a="delete">Delete</button>
        </div>`);
      list.appendChild(card);
      drawCharacter(cv, c);
      card.querySelector('input').onchange = async (e) => {
        c.enabled = e.target.checked;
        await putCharacter(c);
        onCharactersChanged();
      };
      card.querySelector('[data-a="edit"]').onclick = () => openEditor(c);
      const del = card.querySelector('[data-a="delete"]');
      del.onclick = async () => {
        if (!del.dataset.armed) {
          del.dataset.armed = '1';
          del.textContent = 'Tap again to delete';
          setTimeout(() => {
            delete del.dataset.armed;
            del.textContent = 'Delete';
          }, 3000);
          return;
        }
        await deleteCharacter(c.id);
        onCharactersChanged();
        renderCharacters();
      };
    }
    charsEl.querySelector('[data-a="new"]').onclick = () => openEditor(null);
  }

  function lookOf(c, img) {
    return {
      skin: c.skin,
      hair: c.hair,
      body: c.body,
      hat: c.hat,
      accessory: c.accessory,
      size: c.size,
      face: 'normal',
      photo: img,
    };
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function drawCharacter(cv, c, t = 0) {
    const img = await loadImage(c.photo);
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const s = cv.width / 100;
    ctx.scale(s, s);
    drawPerson(ctx, 50, 62, lookOf(c, img), { t, scale: 2.1 / Math.max(1, c.size * 0.9) });
  }

  function openEditor(existing) {
    cancelAnimationFrame(previewRaf);
    const draft = existing
      ? { ...existing, lines: { ...(existing.lines || {}) } }
      : {
        id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        baseType: 'regular',
        body: '#3f6fb5',
        skin: SKINS[1],
        hair: HAIRS[0][0],
        hat: 'none',
        accessory: 'none',
        size: 1,
        photo: null,
        enabled: true,
        lines: {},
      };
    let photoImg = null;
    loadImage(draft.photo).then((img) => { photoImg = img; });

    charsEl.innerHTML = `
      <div class="editor">
        <div class="preview">
          <canvas width="400" height="400"></canvas>
          <p class="hint">Live preview</p>
        </div>
        <div>
          <label class="field"><span>Name</span><input type="text" maxlength="20" data-f="name" placeholder="e.g. Big Dave"></label>
          <label class="field"><span>Behaves like</span>
            <select data-f="baseType">${TYPE_KEYS.map((k) => `<option value="${k}">${GUEST_TYPES[k].name}: ${GUEST_TYPES[k].blurb}</option>`).join('')}</select>
          </label>
          <div class="field"><span>Skin tone</span><div class="swatches" data-sw="skin">${SKINS.map((s) => `<button type="button" style="background:${s}" data-v="${s}" aria-label="Skin ${s}"></button>`).join('')}</div></div>
          <div class="row">
            <label class="field"><span>Clothes colour</span><input type="color" data-f="body"></label>
            <label class="field"><span>Hair</span><select data-f="hair">${HAIRS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
            <label class="field"><span>Hat</span><select data-f="hat">${HATS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
            <label class="field"><span>Extra</span><select data-f="accessory">${ACCESSORIES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>Size</span><input type="range" min="0.8" max="1.5" step="0.05" data-f="size"></label>
          <div class="field"><span>Face photo (optional)</span>
            <div class="row">
              <label class="btn small ghost">Choose or take photo<input type="file" accept="image/*" capture="user" hidden data-a="photo"></label>
              <button type="button" class="btn small ghost" data-a="nophoto">Remove photo</button>
            </div>
            <span class="hint">The photo is cropped into a circle and used as their head. It stays on this device.</span>
          </div>
          <div class="field"><span>Voice lines</span>
            <span class="hint">Up to 5 seconds each. Lines you skip use the default voice for their type.</span>
            <div class="lines"></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start">
            <button class="btn" data-a="save">Save character</button>
            <button class="btn ghost" data-a="cancel">Cancel</button>
          </div>
        </div>
      </div>`;

    const q = (sel) => charsEl.querySelector(sel);
    const fields = charsEl.querySelectorAll('[data-f]');
    fields.forEach((el) => {
      el.value = draft[el.dataset.f];
      el.oninput = () => {
        draft[el.dataset.f] = el.type === 'range' ? Number(el.value) : el.value;
        if (el.dataset.f === 'baseType') renderLines();
      };
    });
    const swatches = q('[data-sw="skin"]');
    const markSkin = () => swatches.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === draft.skin));
    swatches.onclick = (e) => {
      const v = e.target.dataset?.v;
      if (v) {
        draft.skin = v;
        markSkin();
      }
    };
    markSkin();

    q('[data-a="photo"]').onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      if (!img) {
        message('Could not read that image.');
        return;
      }
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 160;
      const g = c.getContext('2d');
      const side = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 160, 160);
      draft.photo = c.toDataURL('image/jpeg', 0.85);
      photoImg = await loadImage(draft.photo);
    };
    q('[data-a="nophoto"]').onclick = () => {
      draft.photo = null;
      photoImg = null;
    };

    function renderLines() {
      const box = q('.lines');
      box.innerHTML = '';
      for (const kind of LINE_KINDS) {
        const row = document.createElement('div');
        row.className = 'slot-row';
        const sample = GUEST_LINES[draft.baseType][kind][0].replace('{n}', 'two').replace('{meat}', 'beef');
        const draw = () => {
          const mine = !!draft.lines[kind];
          row.innerHTML = `
            <div class="lbl"><b>${LINE_LABELS[kind]}<span class="tag ${mine ? 'mine' : ''}">${mine ? 'Recorded' : 'Default'}</span></b><span>e.g. "${esc(sample)}"</span></div>
            <div class="slot-actions">
              <button type="button" class="btn small rec" data-a="rec">Record</button>
              ${uploadHtml}
              ${mine ? '<button type="button" class="btn small ghost" data-a="play">Play</button><button type="button" class="btn small ghost" data-a="del">Delete</button>' : ''}
            </div>`;
          const keep = async (blob) => {
            draft.lines[kind] = blob;
            draw();
            playBlob(blob);
          };
          row.querySelector('[data-a="rec"]').onclick = (e) => record(e.currentTarget, keep);
          bindUpload(row, keep);
          row.querySelector('[data-a="play"]')?.addEventListener('click', () => playBlob(draft.lines[kind]));
          row.querySelector('[data-a="del"]')?.addEventListener('click', () => {
            delete draft.lines[kind];
            draw();
          });
        };
        draw();
        box.appendChild(row);
      }
    }
    renderLines();

    q('[data-a="save"]').onclick = async () => {
      if (active) active.stop();
      draft.name = draft.name.trim() || 'Mystery Guest';
      try {
        await putCharacter(draft);
      } catch (err) {
        message(`Could not save: ${err?.message ?? err}`);
        return;
      }
      message(`${draft.name} saved. They'll turn up in the restaurant soon!`);
      onCharactersChanged();
      renderCharacters();
    };
    q('[data-a="cancel"]').onclick = () => {
      if (active) active.stop();
      renderCharacters();
    };

    const cv = q('.preview canvas');
    const ctx = cv.getContext('2d');
    const frame = (now) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.scale(4, 4);
      drawPerson(ctx, 50, 62, lookOf(draft, photoImg), { t: now / 1000, scale: 2.1 / Math.max(1, draft.size * 0.9) });
      if (root.classList.contains('active')) previewRaf = requestAnimationFrame(frame);
    };
    previewRaf = requestAnimationFrame(frame);
  }

  function playBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = playUrl(url);
    a.addEventListener('ended', () => URL.revokeObjectURL(url));
  }

  // tabs
  root.querySelectorAll('.tab').forEach((tab) => {
    tab.onclick = () => {
      root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      soundsEl.hidden = tab.dataset.tab !== 'sounds';
      charsEl.hidden = tab.dataset.tab !== 'characters';
      message('');
      if (tab.dataset.tab === 'characters') renderCharacters();
    };
  });

  return {
    show() {
      message('');
      renderSounds();
      if (!charsEl.hidden) renderCharacters();
    },
    hide() {
      if (active) active.stop();
      cancelAnimationFrame(previewRaf);
    },
  };
}

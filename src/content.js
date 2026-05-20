// content.js — auto-autofill for JobHawk application pages
;(function () {
  if (window.__jobhawk_autofill_hasRun) return;

  function log(...args) { console.log('[jobhawk-autofill]', ...args); }

  function findRowContaining(text) {
    const needle = String(text).toLowerCase();
    const candidates = Array.from(document.querySelectorAll('tr, div, td, label'));
    return candidates.find(el => (el.innerText || '').toLowerCase().includes(needle));
  }

  function waitForAny(selectorPredicate, timeout = 15000) {
    return new Promise((resolve, reject) => {
      // immediate check
      try {
        const found = selectorPredicate();
        if (found) return resolve(found);
      } catch (e) {}

      const obs = new MutationObserver(() => {
        try {
          const f = selectorPredicate();
          if (f) {
            obs.disconnect();
            resolve(f);
          }
        } catch (e) {}
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: false });
      if (timeout) setTimeout(() => { obs.disconnect(); reject(new Error('timeout')); }, timeout);
    });
  }

  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(['workAuth','major','campusWork','availability','resumeData','resumeName'], items => {
        const defaults = {
          workAuth: 'yes',
          major: 'Computer Science',
          campusWork: 'yes',
          availability: [
            'monday morning','monday afternoon','tuesday morning','tuesday afternoon','wednesday morning','wednesday afternoon','thursday morning','thursday afternoon','friday morning','friday afternoon', 'evenings', 'weekends'
          ],
          resumeData: null,
          resumeName: null
        };
        const out = Object.assign({}, defaults, items);
        if (!Array.isArray(out.availability)) out.availability = defaults.availability.slice();
        resolve(out);
      });
    });
  }

  function matchLabelText(el, needles) {
    const txt = (el.innerText || '').toLowerCase();
    return needles.some(n => txt.includes(n.toLowerCase()));
  }

  async function uploadResumeToInput(inputEl, resumeData, resumeName) {
    if (!resumeData || !resumeName) return false;
    try {
      log('upload started');
      const res = await fetch(resumeData);
      const blob = await res.blob();
      const file = new File([blob], resumeName, { type: blob.type || 'application/octet-stream' });
      const dt = new DataTransfer();
      dt.items.add(file);
      inputEl.files = dt.files;
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      // verify
      if (inputEl.files && inputEl.files.length > 0) {
        log('upload success');
        return true;
      } else {
        log('upload assigned but files empty — will fallback to click');
        inputEl.click();
        log('fallback clicking');
        return false;
      }
    } catch (err) {
      log('upload error', err);
      try { inputEl.click(); log('fallback clicking'); } catch(e){}
      return false;
    }
  }

  async function startAutofill() {
    if (window.__jobhawk_autofill_hasRun) return;
    window.__jobhawk_autofill_hasRun = true;
    log('page detected');

    const settings = await loadSettings();
    log('loaded user settings');

    // Work Authorization
    try {
      const row = findRowContaining('authorized to work');
      if (row) {
        const inputs = Array.from(row.querySelectorAll('input'));
        inputs.forEach(inp => {
          const parentText = (inp.parentElement && inp.parentElement.innerText || '').toLowerCase();
          const want = settings.workAuth.toLowerCase();
          if (parentText.includes(want) && !inp.checked) inp.click();
        });
      }
    } catch (e) { log('workAuth error', e); }

    // Major
    try {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if ((row.innerText || '').toLowerCase().includes('major')) {
          const input = row.querySelector("input[type='text'], input:not([type])");
          if (input) {
            input.focus();
            input.value = settings.major || '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            log('filled major');
            break;
          }
        }
      }
    } catch (e) { log('major error', e); }

    // Campus Work (dropdown)
    try {
      const row = findRowContaining('worked here on campus');
      if (row) {
        const select = row.querySelector('select');
        if (select) {
          const want = settings.campusWork.toLowerCase();
          for (const opt of Array.from(select.options)) {
            if ((opt.text || '').toLowerCase().includes(want)) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
      }
    } catch (e) { log('campusWork error', e); }

    // Availability
    try {
      const wanted = (settings.availability || []).map(s => s.toLowerCase());
      const lis = Array.from(document.querySelectorAll('li'));
      for (const li of lis) {
        const label = li.querySelector('label');
        const cb = li.querySelector("input[type='checkbox']");
        if (!label || !cb) continue;
        const text = (label.innerText || '').toLowerCase();
        const should = wanted.some(w => text.includes(w));
        if (should && !cb.checked) { cb.click(); }
        if (should) log('checked availability', text.trim());
      }
    } catch (e) { log('availability error', e); }

    // Resume upload — wait for file input to exist then attempt upload
    try {
      const fileInput = await waitForAny(() => document.querySelector("input[type='file']"), 20000).catch(() => null);
      if (fileInput) {
        // wait briefly for any framework to initialize the input
        await new Promise(r => setTimeout(r, 300));
        const uploaded = await uploadResumeToInput(fileInput, settings.resumeData, settings.resumeName);
        if (!uploaded) log('fallback clicking');
      } else {
        log('no file input found within timeout');
      }
    } catch (e) { log('resume upload error', e); }

    log('autofill complete');
  }

  // Observe DOM and run once when inputs exist
  (async function observeAndRun() {
    try {
      await waitForAny(() => document.querySelector('input, select, textarea'), 20000);
      startAutofill();
    } catch (e) {
      // fallback: run after load
      window.addEventListener('load', () => startAutofill());
    }
  })();

})();
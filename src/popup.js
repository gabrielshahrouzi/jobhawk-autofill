// popup.js — dynamically build popup UI, save/load settings to chrome.storage.local
(function () {
  const DEFAULTS = {
    workAuth: "yes",
    major: "Computer Science",
    campusWork: "yes",
    availability: [
      "monday morning",
      "monday afternoon",
      "tuesday morning",
      "tuesday afternoon",
      "wednesday morning",
      "wednesday afternoon",
      "thursday morning",
      "thursday afternoon",
      "friday morning",
      "friday afternoon",
      "evenings",
      "weekends"
    ],
    resumeData: null,
    resumeName: null,
    autoSubmit: false
  };

  const AVAIL_OPTIONS = [
    "Monday Morning",
    "Monday Afternoon",
    "Tuesday Morning",
    "Tuesday Afternoon",
    "Wednesday Morning",
    "Wednesday Afternoon",
    "Thursday Morning",
    "Thursday Afternoon",
    "Friday Morning",
    "Friday Afternoon",
    "Evenings",
    "Weekends"
  ];

  function qs(sel) { return document.querySelector(sel); }

  let previewBlobUrl = null;

  function revokePreviewBlob() {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = null;
    }
  }

  function isPdfResume(dataUrl, fileName) {
    if (dataUrl && String(dataUrl).startsWith('data:application/pdf')) return true;
    return fileName && /\.pdf$/i.test(fileName);
  }

  async function updateResumePreview(previewEl, previewLabelEl, dataUrl, fileName) {
    revokePreviewBlob();
    previewEl.innerHTML = '';
    previewEl.hidden = true;
    if (previewLabelEl) previewLabelEl.hidden = true;

    if (!dataUrl || !fileName) return;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      previewBlobUrl = URL.createObjectURL(blob);

      previewEl.hidden = false;
      if (previewLabelEl) previewLabelEl.hidden = false;

      if (isPdfResume(dataUrl, fileName)) {
        const embed = document.createElement('embed');
        embed.type = 'application/pdf';
        embed.src = previewBlobUrl;
        embed.className = 'resume-pdf-embed';
        embed.title = fileName;
        previewEl.appendChild(embed);
      } else {
        const note = document.createElement('p');
        note.className = 'resume-preview-note';
        note.textContent = 'Word documents cannot be previewed here. Open the file in a new tab to confirm it is the correct resume.';
        previewEl.appendChild(note);
      }

      const actions = document.createElement('div');
      actions.className = 'resume-preview-actions';
      const openLink = document.createElement('a');
      openLink.href = previewBlobUrl;
      openLink.target = '_blank';
      openLink.rel = 'noopener';
      openLink.textContent = isPdfResume(dataUrl, fileName)
        ? 'Open full size in new tab'
        : 'Open resume in new tab';
      actions.appendChild(openLink);
      previewEl.appendChild(actions);
    } catch (err) {
      console.error('popup: resume preview failed', err);
      previewEl.hidden = false;
      if (previewLabelEl) previewLabelEl.hidden = false;
      previewEl.textContent = 'Could not load resume preview.';
    }
  }

  function saveSettings(obj) {
    chrome.storage.local.set(obj, () => {
      console.log('popup: saved', obj);
    });
  }

  function readSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(Object.keys(DEFAULTS), items => {
        const out = Object.assign({}, DEFAULTS, items);
        // ensure availability is array
        if (!Array.isArray(out.availability)) out.availability = DEFAULTS.availability.slice();
        resolve(out);
      });
    });
  }

  function buildUI(container) {
    container.innerHTML = '';

    const form = document.createElement('form');
    form.style.fontSize = '12px';

    // Work Authorization
    const waLabel = document.createElement('label');
    waLabel.textContent = 'Work Authorization';
    waLabel.style.display = 'block';
    const waSelect = document.createElement('select');
    waSelect.id = 'workAuth';
    ['yes','no'].forEach(v => {
      const o = document.createElement('option'); o.value = v; o.textContent = v; waSelect.appendChild(o);
    });
    form.appendChild(waLabel); form.appendChild(waSelect);

    // Major
    const majorLabel = document.createElement('label');
    majorLabel.textContent = 'Major'; majorLabel.style.display='block';
    const majorInput = document.createElement('input'); majorInput.type='text'; majorInput.id='major'; majorInput.style.width='100%';
    form.appendChild(majorLabel); form.appendChild(majorInput);

    // Campus Work
    const cwLabel = document.createElement('label'); cwLabel.textContent='Campus Work'; cwLabel.style.display='block';
    const cwSelect = document.createElement('select'); cwSelect.id='campusWork';
    ['yes','no'].forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; cwSelect.appendChild(o); });
    form.appendChild(cwLabel); form.appendChild(cwSelect);

    // Availability
    const avLabel = document.createElement('label'); avLabel.textContent='Availability'; avLabel.style.display='block';
    form.appendChild(avLabel);
    const avList = document.createElement('div'); avList.id='availability';
    AVAIL_OPTIONS.forEach(opt => {
      const id = 'av_' + opt.replace(/\s+/g,'_').toLowerCase();
      const wrapper = document.createElement('div'); wrapper.style.marginBottom='4px';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.id=id; cb.value = opt.toLowerCase();
      const lbl = document.createElement('label'); lbl.htmlFor=id; lbl.textContent = opt; lbl.style.marginLeft='6px';
      wrapper.appendChild(cb); wrapper.appendChild(lbl); avList.appendChild(wrapper);
    });
    form.appendChild(avList);

    // Resume
    const resumeLabel = document.createElement('label'); resumeLabel.textContent='Resume (PDF or DOC)'; resumeLabel.style.display='block';
    const resumeInput = document.createElement('input'); resumeInput.type='file'; resumeInput.id='resume'; resumeInput.accept='application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const resumeName = document.createElement('div'); resumeName.id='resumeName'; resumeName.style.fontSize='11px'; resumeName.style.marginTop='6px';
    const resumePreviewLabel = document.createElement('label'); resumePreviewLabel.className = 'resume-preview-label';
    resumePreviewLabel.textContent = 'Resume preview';
    resumePreviewLabel.hidden = true;
    const resumePreview = document.createElement('div'); resumePreview.id = 'resumePreview'; resumePreview.className = 'resume-preview'; resumePreview.hidden = true;
    form.appendChild(resumeLabel); form.appendChild(resumeInput); form.appendChild(resumeName);
    form.appendChild(resumePreviewLabel); form.appendChild(resumePreview);

    // Auto-submit
    const autoSubmitWrapper = document.createElement('div'); autoSubmitWrapper.style.marginTop = '10px';
    const autoSubmitCb = document.createElement('input'); autoSubmitCb.type = 'checkbox'; autoSubmitCb.id = 'autoSubmit';
    const autoSubmitLbl = document.createElement('label'); autoSubmitLbl.htmlFor = 'autoSubmit';
    autoSubmitLbl.textContent = 'Auto-submit application'; autoSubmitLbl.style.marginLeft = '6px';
    autoSubmitWrapper.appendChild(autoSubmitCb); autoSubmitWrapper.appendChild(autoSubmitLbl);
    form.appendChild(autoSubmitWrapper);

    // Save status
    const status = document.createElement('div'); status.id='status'; status.style.marginTop='8px'; status.style.fontSize='12px';
    form.appendChild(status);

    container.appendChild(form);

    // Wire events
    waSelect.addEventListener('change', () => saveSettings({ workAuth: waSelect.value }));
    majorInput.addEventListener('input', () => saveSettings({ major: majorInput.value }));
    cwSelect.addEventListener('change', () => saveSettings({ campusWork: cwSelect.value }));

    resumeInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        saveSettings({ resumeData: dataUrl, resumeName: f.name });
        resumeName.textContent = f.name;
        status.textContent = 'Resume loaded';
        updateResumePreview(resumePreview, resumePreviewLabel, dataUrl, f.name);
      };
      reader.readAsDataURL(f);
    });

    autoSubmitCb.addEventListener('change', () => saveSettings({ autoSubmit: autoSubmitCb.checked }));

    // availability change handler
    avList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(avList.querySelectorAll('input:checked')).map(i => i.value);
        saveSettings({ availability: selected });
      });
    });

    // expose elements for loading
    return { waSelect, majorInput, cwSelect, avList, resumeName, status, resumeInput, autoSubmitCb, resumePreview, resumePreviewLabel };
  }

  async function init() {
    const container = document.body;
    const elems = buildUI(container);
    const settings = await readSettings();

    // populate
    elems.waSelect.value = settings.workAuth || DEFAULTS.workAuth;
    elems.majorInput.value = settings.major || DEFAULTS.major;
    elems.cwSelect.value = settings.campusWork || DEFAULTS.campusWork;

    const availLower = (settings.availability || []).map(s => s.toLowerCase());
    elems.avList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = availLower.includes(cb.value);
    });

    if (settings.resumeName) elems.resumeName.textContent = settings.resumeName;
    if (settings.resumeData && settings.resumeName) {
      updateResumePreview(elems.resumePreview, elems.resumePreviewLabel, settings.resumeData, settings.resumeName);
    }
    elems.autoSubmitCb.checked = !!settings.autoSubmit;
    elems.status.textContent = 'Loaded saved settings';
  }

  document.addEventListener('DOMContentLoaded', init);

})();

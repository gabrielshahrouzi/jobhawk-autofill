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

  const POPUP_ICON = "icons/icon48.png";

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
        if (!Array.isArray(out.availability)) out.availability = DEFAULTS.availability.slice();
        resolve(out);
      });
    });
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function field(labelText, control) {
    const wrap = el('div', 'field');
    const label = el('label', 'field-label', labelText);
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }

  function card(title) {
    const section = el('section', 'card');
    section.appendChild(el('h2', 'card-title', title));
    return section;
  }

  function buildHeader() {
    const header = el('header', 'popup-header');
    const logo = document.createElement('img');
    logo.className = 'popup-logo';
    logo.src = POPUP_ICON;
    logo.alt = '';
    logo.addEventListener('error', () => logo.classList.add('popup-logo--hidden'));

    const text = el('div', 'popup-header-text');
    text.appendChild(el('h1', null, 'JobHawk – Application Autofill'));
    text.appendChild(el('p', null, 'Your saved profile for JobHawk apply pages'));

    header.appendChild(logo);
    header.appendChild(text);
    return header;
  }

  function buildUI(container) {
    container.innerHTML = '';
    container.appendChild(buildHeader());

    const form = el('form', 'popup-form');

    const profileCard = card('Profile');
    const waSelect = document.createElement('select');
    waSelect.id = 'workAuth';
    waSelect.className = 'field-control';
    ['yes', 'no'].forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      waSelect.appendChild(o);
    });
    profileCard.appendChild(field('Work authorization', waSelect));

    const majorInput = document.createElement('input');
    majorInput.type = 'text';
    majorInput.id = 'major';
    majorInput.className = 'field-control';
    profileCard.appendChild(field('Major', majorInput));

    const cwSelect = document.createElement('select');
    cwSelect.id = 'campusWork';
    cwSelect.className = 'field-control';
    ['yes', 'no'].forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      cwSelect.appendChild(o);
    });
    profileCard.appendChild(field('Campus work', cwSelect));
    form.appendChild(profileCard);

    const scheduleCard = card('Availability');
    const avList = el('div', 'availability-list');
    avList.id = 'availability';
    AVAIL_OPTIONS.forEach(opt => {
      const id = 'av_' + opt.replace(/\s+/g, '_').toLowerCase();
      const item = el('label', 'availability-item');
      item.htmlFor = id;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = opt.toLowerCase();
      item.appendChild(cb);
      item.appendChild(document.createTextNode(opt));
      avList.appendChild(item);
    });
    scheduleCard.appendChild(avList);
    form.appendChild(scheduleCard);

    const resumeCard = card('Resume');
    const resumeInput = document.createElement('input');
    resumeInput.type = 'file';
    resumeInput.id = 'resume';
    resumeInput.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const fileWrap = el('label', 'file-upload');
    fileWrap.appendChild(resumeInput);
    resumeCard.appendChild(field('Upload (PDF or Word)', fileWrap));

    const resumeName = el('div', 'resume-name');
    resumeName.id = 'resumeName';
    resumeCard.appendChild(resumeName);

    const resumePreviewLabel = el('label', 'resume-preview-label', 'Preview');
    resumePreviewLabel.hidden = true;
    const resumePreview = el('div', 'resume-preview');
    resumePreview.id = 'resumePreview';
    resumePreview.hidden = true;
    resumeCard.appendChild(resumePreviewLabel);
    resumeCard.appendChild(resumePreview);
    form.appendChild(resumeCard);

    const optionsCard = card('Options');
    const autoSubmitRow = el('label', 'option-row');
    autoSubmitRow.htmlFor = 'autoSubmit';
    const autoSubmitCb = document.createElement('input');
    autoSubmitCb.type = 'checkbox';
    autoSubmitCb.id = 'autoSubmit';
    const autoSubmitText = el('span', null, 'Auto-submit application after autofill');
    autoSubmitRow.appendChild(autoSubmitCb);
    autoSubmitRow.appendChild(autoSubmitText);
    optionsCard.appendChild(autoSubmitRow);
    form.appendChild(optionsCard);

    const status = el('p', 'status');
    status.id = 'status';
    form.appendChild(status);

    container.appendChild(form);

    waSelect.addEventListener('change', () => saveSettings({ workAuth: waSelect.value }));
    majorInput.addEventListener('input', () => saveSettings({ major: majorInput.value }));
    cwSelect.addEventListener('change', () => saveSettings({ campusWork: cwSelect.value }));

    resumeInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        const dataUrl = evt.target.result;
        saveSettings({ resumeData: dataUrl, resumeName: f.name });
        resumeName.textContent = f.name;
        status.textContent = 'Resume saved';
        status.className = 'status status--ok';
        updateResumePreview(resumePreview, resumePreviewLabel, dataUrl, f.name);
      };
      reader.readAsDataURL(f);
    });

    autoSubmitCb.addEventListener('change', () => saveSettings({ autoSubmit: autoSubmitCb.checked }));

    avList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(avList.querySelectorAll('input:checked')).map(i => i.value);
        saveSettings({ availability: selected });
      });
    });

    return {
      waSelect,
      majorInput,
      cwSelect,
      avList,
      resumeName,
      status,
      resumeInput,
      autoSubmitCb,
      resumePreview,
      resumePreviewLabel
    };
  }

  async function init() {
    const elems = buildUI(document.body);
    const settings = await readSettings();

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
    elems.status.textContent = 'Settings loaded';
    elems.status.className = 'status status--ok';
  }

  document.addEventListener('DOMContentLoaded', init);
})();

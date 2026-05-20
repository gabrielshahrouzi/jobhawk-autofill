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
    resumeName: null
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
    form.appendChild(resumeLabel); form.appendChild(resumeInput); form.appendChild(resumeName);

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
      };
      reader.readAsDataURL(f);
    });

    // availability change handler
    avList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(avList.querySelectorAll('input:checked')).map(i => i.value);
        saveSettings({ availability: selected });
      });
    });

    // expose elements for loading
    return { waSelect, majorInput, cwSelect, avList, resumeName, status, resumeInput };
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
    elems.status.textContent = 'Loaded saved settings';
    // Create fill button for manual testing/debugging
    const fillBtn = document.createElement('button');
    fillBtn.textContent = 'Fill Application';
    fillBtn.style.marginTop = '8px';
    fillBtn.style.width = '100%';
    fillBtn.addEventListener('click', () => {
      elems.status.textContent = 'Sending fill request...';
      // message content script to run autofill (force)
      chrome.runtime.sendMessage({ action: 'fill' }, resp => {
        elems.status.textContent = resp && resp.ok ? 'Fill request sent' : 'Fill request sent';
      });
    });
    container.appendChild(fillBtn);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
document.getElementById("fillBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});
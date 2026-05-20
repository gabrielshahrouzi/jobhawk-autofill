function fillForm() {
  console.log("🚀 Autofill started");

  // Helper: find element containing text
  function findRowByText(text) {
    return Array.from(document.querySelectorAll("div, tr")).find(el =>
      el.innerText?.toLowerCase().includes(text.toLowerCase())
    );
  }

  // ✅ 1. Work authorization → YES
  const workAuthRow = findRowByText("authorized to work");
  if (workAuthRow) {
    const inputs = workAuthRow.querySelectorAll("input");
    inputs.forEach(input => {
      const parentText = input.parentElement.innerText.toLowerCase();
      if (parentText.includes("yes") && !input.checked) {
        input.click();
      }
    });
  }

  // ✅ Fill Major using table row detection
  (function () {
    const rows = document.querySelectorAll("tr");

    rows.forEach(row => {
      const text = row.innerText.toLowerCase();

      if (text.includes("major")) {
        const input = row.querySelector("input[type='text']");
        
        if (input) {
          input.value = "Computer Science"; // <-- change if needed
          input.dispatchEvent(new Event("input", { bubbles: true }));
          console.log("✅ Filled Major");
        }
      }
    });
  })();

  // ✅ 3. Campus work dropdown
  const campusRow = findRowByText("worked here on campus");
  if (campusRow) {
    const select = campusRow.querySelector("select");
    if (select) {
      for (let option of select.options) {
        if (option.text.toLowerCase().includes("yes")) {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  }

  // ✅ Fill Availability (robust)
  (function () {
    const wantedSlots = [
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
    ];


    // Go through all list items
    document.querySelectorAll("li").forEach(li => {
      const label = li.querySelector("label");
      const checkbox = li.querySelector("input[type='checkbox']");

      if (!label || !checkbox) return;

      const text = label.innerText.toLowerCase();

      const match = wantedSlots.some(slot => text.includes(slot));

      if (match && !checkbox.checked) {
        checkbox.click();
        console.log("✅ Checked:", text);
      }
    });
  })();

  // ✅ 5. Highlight resume upload
  const fileInput = document.querySelector("input[type='file']");
  if (fileInput) {
    fileInput.style.border = "3px solid red";
    fileInput.scrollIntoView({ behavior: "smooth" });
  }

  console.log("✅ Autofill complete");
}

fillForm();
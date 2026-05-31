# Application Autofill for JobHawk

A Chrome extension (Manifest V3) that autofills application forms on JobHawk using your saved profile, availability, resume, and optional auto-submit.

## Demo

[![Watch the demo](https://img.youtube.com/vi/JXrAsIIrRDk/0.jpg)](https://youtu.be/JXrAsIIrRDk)

## What it does

- Detects when the user visits `https://jobhawk.studentemployment.ngwebsolutions.com/Jobx_Apply.aspx*`
- Loads saved user settings from `chrome.storage.local`
- Automatically fills work authorization, major, campus work, availability checkboxes, and resume upload
- Runs automatically on page load

## Files

- `src/manifest.json` — extension manifest, content script registration, permissions
- `src/popup.html` — popup shell
- `src/popup.js` — popup UI + settings persistence
- `src/content.js` — page autofill behavior and resume upload logic

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `src/` folder from this repo
5. Open the popup and set your answers, including resume upload

## Usage

- Save your answers in the popup UI
- Visit a JobHawk apply page
- The extension automatically applies the stored values to the form

## Notes

- The extension uses `chrome.storage.local` to persist your settings
- The popup UI stores the resume file as a base64 Data URL so it can be uploaded automatically
- The content script is limited to the matching JobHawk apply URL

## Validation workflow

This repository includes a basic GitHub Actions workflow that validates the extension manifest and checks JavaScript syntax on every push and pull request.

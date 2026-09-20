# E3 Rentals Warehouse Hardware Setup & Operational SOP

This document provides the standard operating procedure (SOP) for configuring, testing, and deploying RFID scanners, thermal label printers, and on-metal transponders for the E3 Rentals warehouse tracking system.

---

## 1. Hardware Architecture Overview

| Hardware Component | Model / Spec | Purpose | Communication Mode |
| :--- | :--- | :--- | :--- |
| **RFID Sled Scanner** | **Chainway R6 UHF Sled** (or Zebra RFD40) | High-speed inventory check, staging, transport dispatch, and return intake | Bluetooth BLE / SPP (Keyboard Wedge) |
| **Mobile Computer / Phone** | Android Smartphone (Android 10+) or iOS device | Host screen running the E3 Rentals Web Dashboard | Physical mount onto R6 sled |
| **Thermal Roll Printer** | **Postek TX3r / Zebra ZD421T** (300 DPI) | Continuous 1-across label printing (4"×2" / 100mm×50mm) | USB / Ethernet RAW Port 9100 / Seagull Driver |
| **Printing Consumable** | **Full Resin Thermal Transfer Ribbon** | Extreme weatherproofing, UV resistance, scratch immunity | Thermal transfer with synthetic labels |
| **Metal Asset Tags** | **OEM Flexible On-Metal UHF Tags** (Confidex Blade II) | Heavy machinery, trussing, flight cases, scaffolding | Factory pre-printed & pre-encoded (EPC) |

---

## 2. Chainway R6 UHF Sled Configuration (Android)

The Chainway R6 connects to any Android smartphone and inputs scans directly into the web application via Keyboard Wedge mode.

### Step-by-Step Setup:
1. **Mount the Smartphone:**
   * Snap the Android device into the custom sled cradle or magnetic mount on the top of the Chainway R6.
2. **Install Chainway Software:**
   * Download and install the **Chainway Keyboard Emulator APK** (or *2D/UHF Barcode Service*) from the manufacturer's resource drive.
3. **Pair Bluetooth:**
   * Power on the Chainway R6 by holding the side power button until the blue LED blinks.
   * On your phone, go to **Settings → Bluetooth** and pair with `Chainway_R6_XXXX`.
4. **Configure Keyboard Emulator App Settings:**
   * Open the **Keyboard Emulator** app:
     * **Function Mode:** Select `UHF RFID`.
     * **Release Key / Suffix:** Set to `Enter (CRLF)`. *(Crucial: allows the web application to catch the end of each tag).*
     * **Barcode/RFID Output Mode:** Select `Focus Field (Simulate Keystrokes)`.
     * **Continuous / Single Read:**
       * For **Fulfillment / Bulk Staging:** Select `Inventory (Continuous Burst)`.
       * For **Tag Commissioning:** Select `Single Tag Read`.
     * **RF Output Power:** Set to `30 dBm` for maximum 6–10 meter range, or `15–20 dBm` for close-range commissioning.
     * **EPC Memory Bank:** Set to `EPC (96-bit / 128-bit)`.
     * **Sound & Vibration:** Enable `Beeper ON` for audio confirmation upon tag detection.
5. **Lock Background App:**
   * In Android App Settings, disable *Battery Optimization* for the Chainway Keyboard Emulator app and lock it in the recent apps tray so Android does not close it in sleep mode.

---

## 3. Industrial Thermal Label Printer Configuration

To ensure crisp barcodes, scannable QR codes, and correct page breaks on continuous roll media:

### Media Specifications:
* **Label Media:** Synthetic White Gloss Polyester / Synthetic PET (100mm width × 50mm height / 4" × 2").
* **Ribbon:** Full Resin Ribbon (wax-resin will rub off on metal flight cases and outdoor staging).

### Driver Setup (Windows / Mac Seagull Driver):
1. **Page Size:** Set Custom Page Size to `Width: 100.0 mm`, `Height: 50.0 mm`.
2. **Media Type:** Set to `Thermal Transfer` (Ribbon installed).
3. **Sensor Type:** Set to `Transmissive / Gap Sensor` (detects gap between label stickers).
4. **Print Speed:** Set to `3.0 inches/sec (ips)` or `4.0 ips` (slower speeds ensure high edge-contrast for QR codes).
5. **Printhead Darkness / Density:** Set to `18 to 22` (Full resin requires higher heat than standard paper wax ribbons).
6. **Handling / Cutter:** Set to `Tear-Off` (stops at gap for easy manual tearing).

---

## 4. On-Metal RFID Tag Placement Guidelines

Because bare metal absorbs RF energy, on-metal transponders have a built-in ferrite isolation layer. Follow these placement rules:

1. **Flat Metallic Surfaces:**
   * Affix the tag on a flat, clean metallic area (wipe surface with isopropyl alcohol before applying).
2. **Orientation:**
   * Align tags consistently across your fleet (e.g., top-left corner of flight case lid or adjacent to the case recessed handle).
3. **Do Not Bend or Crease:**
   * Although flexible, bending the tag sharply across 90-degree metal corners will damage the internal ferrite shield and reduce read range from 6m to under 30cm.
4. **Distance from Hinges and Latches:**
   * Keep at least 30mm (1.2 inches) away from heavy steel latches or structural corner caster plates.

---

## 5. Warehouse Assembly-Line Commissioning SOP

When receiving new equipment with rolls of pre-encoded factory RFID tags:

1. Open **Warehouse Dashboard → Hardware Setup → Assembly-Line Commissioning** (`/dashboard/warehouse/setup`).
2. **Step 1:** Scan the human-readable Asset Tag Code on the equipment (e.g., `E3-TRUSS-001`).
3. **Step 2:** Pull the trigger on the RFID sled over the new RFID tag. The 24-character hexadecimal EPC (e.g., `E280...`) is captured.
4. **Step 3:** The system confirms with a green chime and binds the tag in the database with collision prevention.
5. **Step 4:** Stick the tag firmly onto the equipment. Next item!

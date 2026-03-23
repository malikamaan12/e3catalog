// 30 enterprise-grade demo products for the E3 catalog
// Each product maps to one of the 20 live categories by slug

export const dummyProducts = [
    // ─── STAGING ──────────────────────────────────────────────────────────
    {
        itemCode: "STG-001", categorySlug: "staging",
        name: "Heavy-Duty Modular Stage Platform 4x8ft",
        shortDescription: "Steel-framed modular platform with non-slip deck, adjustable legs 60–100cm.",
        dimensions: "4ft x 8ft x 0.6m–1.0m (adj.)", weight: "48 kg per unit", powerRequirements: "None",
        materials: "Galvanized steel frame, plywood deck with non-slip surface",
        pricePerDay: 120, units: 20, condition: "excellent", warehouseLocation: "Warehouse A – Staging Bay 1",
        thumbnailUrl: "",
    },
    {
        itemCode: "STG-002", categorySlug: "staging",
        name: "Mobile Stage Unit 6x4m with Roof",
        shortDescription: "Self-contained mobile stage on trailer, fast deployment, 6x4m performance area with integrated roof.",
        dimensions: "6m x 4m performance area", weight: "2,200 kg total", powerRequirements: "None",
        materials: "Aluminum frame, weatherproof polycarbonate roof panels",
        pricePerDay: 1800, units: 2, condition: "excellent", warehouseLocation: "Outdoor Lot B",
        thumbnailUrl: "",
    },

    // ─── EXHIBITIONS ──────────────────────────────────────────────────────
    {
        itemCode: "EXH-001", categorySlug: "exhibitions",
        name: "Custom Exhibition Stand 3x3m",
        shortDescription: "Fully branded 3x3m stand with tension fabric walls, LED spotlights, and lockable storage counter.",
        dimensions: "3m x 3m x 2.5m", weight: "85 kg", powerRequirements: "220V / 500W",
        materials: "Aluminum extrusion, tension fabric graphics panels",
        pricePerDay: 650, units: 8, condition: "excellent", warehouseLocation: "Warehouse B – Exhibitions Hall",
        thumbnailUrl: "",
    },
    {
        itemCode: "EXH-002", categorySlug: "exhibitions",
        name: "Shell Scheme Package 6sqm",
        shortDescription: "Standard shell scheme booth 2x3m with fascia nameplate, carpet, and halogen spotlights.",
        dimensions: "2m x 3m x 2.5m", weight: "40 kg", powerRequirements: "220V / 300W",
        materials: "Octanorm aluminum system, melamine panels",
        pricePerDay: 280, units: 15, condition: "good", warehouseLocation: "Warehouse B – Bay 4",
        thumbnailUrl: "",
    },

    // ─── STRUCTURES ───────────────────────────────────────────────────────
    {
        itemCode: "STR-001", categorySlug: "structures",
        name: "Heavy-Duty Frame Tent 10x20m",
        shortDescription: "Industrial frame tent 200sqm, no center poles, sidewall panels included, meets TUV site standards.",
        dimensions: "10m x 20m x 4.5m", weight: "860 kg", powerRequirements: "None",
        materials: "Hot-dip galvanized steel, 650gsm PVC fabric",
        pricePerDay: 2200, units: 3, condition: "excellent", warehouseLocation: "Outdoor Lot A – Tent Storage",
        thumbnailUrl: "",
    },
    {
        itemCode: "STR-002", categorySlug: "structures",
        name: "Fabric Shade Structure 5x5m",
        shortDescription: "High-shade tensile fabric sail 5x5m with stainless steel cables and concrete block anchors.",
        dimensions: "5m x 5m", weight: "120 kg", powerRequirements: "None",
        materials: "320gsm HDPE UV-resistant shade fabric, SS316 cabling",
        pricePerDay: 380, units: 10, condition: "excellent", warehouseLocation: "Warehouse A – Shade Bay",
        thumbnailUrl: "",
    },

    // ─── RIGGING & TRUSS ──────────────────────────────────────────────────
    {
        itemCode: "RIG-001", categorySlug: "rigging-truss",
        name: "Aluminum Box Truss 2m Section (400mm)",
        shortDescription: "Heavy-duty 400mm x 400mm box truss, rated to 450 kg/m UDL, compatible with all major motor systems.",
        dimensions: "2000mm L x 400mm W x 400mm H", weight: "12 kg", powerRequirements: "None",
        materials: "6082-T6 aerospace aluminum, welded construction",
        pricePerDay: 35, units: 80, condition: "excellent", warehouseLocation: "Warehouse C – Truss Rack",
        thumbnailUrl: "",
    },
    {
        itemCode: "RIG-002", categorySlug: "rigging-truss",
        name: "Chain Motor 1 Tonne CM Lodestar",
        shortDescription: "CM Lodestar 1T electric chain hoist with 6m chain drop, CE/DGUV rated for overhead lifting.",
        dimensions: "320mm x 200mm x 280mm", weight: "22 kg", powerRequirements: "380V 3-phase / 1.1kW",
        materials: "Die-cast aluminum housing, grade 100 alloy steel chain",
        pricePerDay: 180, units: 12, condition: "excellent", warehouseLocation: "Warehouse C – Motor Room",
        thumbnailUrl: "",
    },

    // ─── LIGHTING ─────────────────────────────────────────────────────────
    {
        itemCode: "LGT-001", categorySlug: "lighting",
        name: "Moving Head Beam 350W Sharpy",
        shortDescription: "High-intensity 350W moving head beam with gobos, prism, and 14-channel DMX control.",
        dimensions: "395mm L x 195mm W x 540mm H", weight: "16.5 kg", powerRequirements: "220V / 480W",
        materials: "Die-cast aluminum, borosilicate optics",
        pricePerDay: 250, units: 24, condition: "excellent", warehouseLocation: "Warehouse D – Lighting Rack A",
        thumbnailUrl: "",
    },
    {
        itemCode: "LGT-002", categorySlug: "lighting",
        name: "LED PAR Can RGBWA 18x18W",
        shortDescription: "18x18W RGBWA LED wash fixture, wireless DMX ready, 25° beam angle, IP65 rated.",
        dimensions: "250mm dia x 280mm H", weight: "3.8 kg", powerRequirements: "220V / 130W",
        materials: "Powder-coated die-cast aluminum",
        pricePerDay: 45, units: 60, condition: "excellent", warehouseLocation: "Warehouse D – Lighting Rack B",
        thumbnailUrl: "",
    },

    // ─── AUDIO ────────────────────────────────────────────────────────────
    {
        itemCode: "AUD-001", categorySlug: "audio",
        name: "Line Array Speaker System d&b J-Series (per box)",
        shortDescription: "d&b Audiotechnik J8 line array element, 3-way active, 136dB SPL, 70° horizontal coverage.",
        dimensions: "700mm W x 360mm D x 370mm H", weight: "40 kg", powerRequirements: "230V / 2000W",
        materials: "Birch plywood, Nextel coated",
        pricePerDay: 320, units: 16, condition: "excellent", warehouseLocation: "Warehouse D – Audio Bay",
        thumbnailUrl: "",
    },
    {
        itemCode: "AUD-002", categorySlug: "audio",
        name: "Wireless Microphone System Shure Axient",
        shortDescription: "Shure Axient Digital 2-channel wireless system. 470–616MHz, 20Hz–20kHz frequency response.",
        dimensions: "482mm W x 44mm H x 140mm D (receiver rack)", weight: "6.2 kg", powerRequirements: "220V / 50W",
        materials: "Steel rack chassis, carbon fiber handheld capsule",
        pricePerDay: 210, units: 8, condition: "excellent", warehouseLocation: "Warehouse D – Audio Bay",
        thumbnailUrl: "",
    },

    // ─── LED & DISPLAYS ───────────────────────────────────────────────────
    {
        itemCode: "LED-001", categorySlug: "led-displays",
        name: "Indoor P3.9 LED Video Screen Panel (0.5x0.5m)",
        shortDescription: "P3.9mm pitch indoor LED panel, 2500 nits brightness, seamless tiling, 60° viewing angle.",
        dimensions: "500mm W x 500mm H x 75mm D", weight: "7.5 kg per panel", powerRequirements: "220V / 150W per panel",
        materials: "Die-cast aluminum cabinet, pitch 3.9mm SMD LED",
        pricePerDay: 95, units: 100, condition: "excellent", warehouseLocation: "Warehouse E – LED Storage",
        thumbnailUrl: "",
    },
    {
        itemCode: "LED-002", categorySlug: "led-displays",
        name: "75\" Commercial Display Monitor 4K",
        shortDescription: "Samsung QM75B commercial 4K UHD monitor, 500 nit, landscape/portrait, HDMI/DP inputs.",
        dimensions: "1684mm W x 970mm H x 69mm D", weight: "58 kg", powerRequirements: "220V / 350W",
        materials: "Tempered glass, aluminum bezel",
        pricePerDay: 280, units: 10, condition: "excellent", warehouseLocation: "Warehouse E – AV Bay",
        thumbnailUrl: "",
    },

    // ─── POWER & ELECTRICAL ───────────────────────────────────────────────
    {
        itemCode: "PWR-001", categorySlug: "power-electrical",
        name: "100 kVA Silent Diesel Generator",
        shortDescription: "SDMO 100kVA soundproofed diesel generator, 80kW output, < 68dB at 7m, automatic voltage regulation.",
        dimensions: "3200mm L x 1100mm W x 1500mm H", weight: "1,850 kg", powerRequirements: "Diesel. Produces 380/220V 3-phase",
        materials: "Steel soundproof enclosure, Stamford alternator",
        pricePerDay: 1200, units: 4, condition: "excellent", warehouseLocation: "Outdoor Lot C – Generator Yard",
        thumbnailUrl: "",
    },
    {
        itemCode: "PWR-002", categorySlug: "power-electrical",
        name: "32A Distribution Board (8-way Socapex)",
        shortDescription: "Portable 32A 3-phase power distro with 8 x Socapex 19-pin outlets, RCD protected.",
        dimensions: "600mm W x 400mm H x 200mm D", weight: "18 kg", powerRequirements: "32A 3-phase input",
        materials: "Powder-coated steel enclosure",
        pricePerDay: 85, units: 20, condition: "excellent", warehouseLocation: "Warehouse C – Electrical Bay",
        thumbnailUrl: "",
    },

    // ─── CLIMATE & UTILITIES ──────────────────────────────────────────────
    {
        itemCode: "CLM-001", categorySlug: "climate-utilities",
        name: "Portable Spot Cooler 10TR / 35,000 BTU",
        shortDescription: "Industrial portable spot cooler, 10 ton cooling, ducted airflow up to 30m, 380V 3-phase.",
        dimensions: "1000mm L x 560mm W x 1450mm H", weight: "210 kg", powerRequirements: "380V 3-phase / 8.5kW",
        materials: "Galvanized steel chassis, R-410A refrigerant",
        pricePerDay: 450, units: 6, condition: "excellent", warehouseLocation: "Outdoor Lot C – HVAC Yard",
        thumbnailUrl: "",
    },

    // ─── FURNITURE ────────────────────────────────────────────────────────
    {
        itemCode: "FRN-001", categorySlug: "furniture",
        name: "Banquet Chair (Crossback Wooden)",
        shortDescription: "Premium crossback wooden banquet chair with ivory cushion, stackable, weight rated 150kg.",
        dimensions: "450mm W x 430mm D x 950mm H", weight: "4.2 kg", powerRequirements: "None",
        materials: "Solid beech wood, polyester cushion",
        pricePerDay: 12, units: 200, condition: "excellent", warehouseLocation: "Warehouse F – Furniture Bay",
        thumbnailUrl: "",
    },
    {
        itemCode: "FRN-002", categorySlug: "furniture",
        name: "Round Cocktail Table 60cm with Linen",
        shortDescription: "Chrome pedestal cocktail table 106cm height with 60cm round top and full-length white linen.",
        dimensions: "600mm dia x 1060mm H", weight: "9 kg", powerRequirements: "None",
        materials: "Steel pedestal, MDF top, polyester linen",
        pricePerDay: 28, units: 80, condition: "excellent", warehouseLocation: "Warehouse F – Furniture Bay",
        thumbnailUrl: "",
    },

    // ─── DECOR ────────────────────────────────────────────────────────────
    {
        itemCode: "DCR-001", categorySlug: "decor",
        name: "Ceiling Drape Kit (10m x 10m Swag)",
        shortDescription: "Complete ceiling drape kit with 10x10m sheer voile, fairy lights, and rigging hardware. Setup included.",
        dimensions: "Covers 10m x 10m area", weight: "22 kg total", powerRequirements: "220V / 200W (fairy lights)",
        materials: "190gsm sheer voile, LED fairy string lights",
        pricePerDay: 380, units: 5, condition: "excellent", warehouseLocation: "Warehouse F – Decor Bay",
        thumbnailUrl: "",
    },

    // ─── BRANDING ─────────────────────────────────────────────────────────
    {
        itemCode: "BRN-001", categorySlug: "branding",
        name: "Step & Repeat Backdrop Stand 3x2.5m",
        shortDescription: "Adjustable step-and-repeat banner stand 3m x 2.5m with pressure-fit aluminum frame. Print not included.",
        dimensions: "3000mm W x 2500mm H", weight: "12 kg", powerRequirements: "None",
        materials: "Anodized aluminum telescopic frame",
        pricePerDay: 95, units: 12, condition: "excellent", warehouseLocation: "Warehouse B – Branding Bay",
        thumbnailUrl: "",
    },

    // ─── WAYFINDING ───────────────────────────────────────────────────────
    {
        itemCode: "WFD-001", categorySlug: "wayfinding",
        name: "Outdoor Totem Sign Post 2m (A4 Holder)",
        shortDescription: "Powder-coated aluminum totem post 2m tall with weighted base and A4 portrait sign holder.",
        dimensions: "120mm sq x 2000mm H", weight: "8.5 kg", powerRequirements: "None",
        materials: "6063 aluminum extrusion, cast iron base",
        pricePerDay: 35, units: 40, condition: "excellent", warehouseLocation: "Warehouse B – Signage Bay",
        thumbnailUrl: "",
    },

    // ─── CROWD CONTROL ────────────────────────────────────────────────────
    {
        itemCode: "CRD-001", categorySlug: "crowd-control",
        name: "Mojo Crowd Barrier Section 2.2m",
        shortDescription: "Heavy-duty steel Mojo barrier 2.2m, interlocking, rated for 3,000N crowd pressure, galvanized finish.",
        dimensions: "2200mm W x 1100mm H x 550mm D", weight: "16.5 kg", powerRequirements: "None",
        materials: "Hot-dip galvanized mild steel",
        pricePerDay: 22, units: 150, condition: "excellent", warehouseLocation: "Warehouse G – Crowd Control",
        thumbnailUrl: "",
    },
    {
        itemCode: "CRD-002", categorySlug: "crowd-control",
        name: "Queue Stanchion Retractable 1.5m Belt",
        shortDescription: "Polished SS304 stanchion post, 1m height with 1.5m retractable belt, wall-mount bracket included.",
        dimensions: "350mm base dia x 1000mm H", weight: "5 kg", powerRequirements: "None",
        materials: "SS304 brushed stainless, ABS belt cassette",
        pricePerDay: 15, units: 80, condition: "good", warehouseLocation: "Warehouse G – Crowd Control",
        thumbnailUrl: "",
    },

    // ─── ENTERTAINMENT ────────────────────────────────────────────────────
    {
        itemCode: "ENT-001", categorySlug: "entertainment",
        name: "Multi-Game Arcade Machine (60-in-1)",
        shortDescription: "Upright arcade cabinet with 60 classic games, 27\" LCD, LED lit marquee, coin-op disabled for events.",
        dimensions: "680mm W x 830mm D x 1850mm H", weight: "95 kg", powerRequirements: "220V / 250W",
        materials: "MDF cabinet, tempered glass screen, melamine finish",
        pricePerDay: 280, units: 6, condition: "good", warehouseLocation: "Warehouse H – Entertainment",
        thumbnailUrl: "",
    },

    // ─── SPORTS EQUIPMENT ─────────────────────────────────────────────────
    {
        itemCode: "SPT-001", categorySlug: "sports-equipment",
        name: "FIFA-Spec Football Goal 7.32x2.44m",
        shortDescription: "Full-size portable aluminum football goal with net, ground anchors, and carry bag.",
        dimensions: "7320mm W x 2440mm H x 1500mm D", weight: "62 kg", powerRequirements: "None",
        materials: "80mm round aluminum alloy, HDPE net",
        pricePerDay: 350, units: 4, condition: "excellent", warehouseLocation: "Outdoor Lot B – Sports",
        thumbnailUrl: "",
    },

    // ─── EVENT TECHNOLOGY ─────────────────────────────────────────────────
    {
        itemCode: "EVT-001", categorySlug: "event-technology",
        name: "Event Registration Laptop – Dell Latitude 15\"",
        shortDescription: "Pre-configured Dell Latitude 15\" i7 laptop, 16GB RAM, Windows 11 Pro, ready for event software.",
        dimensions: "356mm W x 243mm D x 19mm H", weight: "1.85 kg", powerRequirements: "220V / 65W",
        materials: "Magnesium alloy chassis",
        pricePerDay: 120, units: 15, condition: "excellent", warehouseLocation: "Warehouse D – IT Bay",
        thumbnailUrl: "",
    },
    {
        itemCode: "EVT-002", categorySlug: "event-technology",
        name: "iPad Station with Enclosure & Stand",
        shortDescription: "iPad 10th gen in portrait lockdown enclosure on adjustable floor stand. Survey/registration ready.",
        dimensions: "450mm W x 1200mm H x 380mm D", weight: "8 kg", powerRequirements: "220V / 20W",
        materials: "Powder-coated steel stand, ABS enclosure",
        pricePerDay: 95, units: 20, condition: "excellent", warehouseLocation: "Warehouse D – IT Bay",
        thumbnailUrl: "",
    },

    // ─── LOGISTICS EQUIPMENT ─────────────────────────────────────────────
    {
        itemCode: "LOG-001", categorySlug: "logistics-equipment",
        name: "Electric Pallet Jack 2T – Yale",
        shortDescription: "Yale MO20 electric pallet truck, 2-tonne capacity, 1150mm forks, 8-hour battery life.",
        dimensions: "1785mm L x 750mm W x 1230mm H", weight: "330 kg", powerRequirements: "24V DC battery / 220V charger",
        materials: "Steel chassis, polyurethane drive wheel",
        pricePerDay: 280, units: 3, condition: "good", warehouseLocation: "Warehouse A – Loading Bay",
        thumbnailUrl: "",
    },

    // ─── SAFETY EQUIPMENT ─────────────────────────────────────────────────
    {
        itemCode: "SFT-001", categorySlug: "safety-equipment",
        name: "CO2 Fire Extinguisher 5kg Set (10 units)",
        shortDescription: "10x 5kg CO2 fire extinguishers, TUV certified, inspection tags current, with trolley transport frame.",
        dimensions: "160mm dia x 680mm H per unit", weight: "14 kg charged per unit", powerRequirements: "None",
        materials: "Spun steel cylinder, brass valve",
        pricePerDay: 150, units: 8, condition: "excellent", warehouseLocation: "Warehouse G – Safety Store",
        thumbnailUrl: "",
    },

    // ─── MANPOWER ─────────────────────────────────────────────────────────
    {
        itemCode: "MNP-001", categorySlug: "manpower",
        name: "Certified Stage Rigger (Day Rate)",
        shortDescription: "IRATA Level 2 certified stage rigger for theatrical and structural overhead rigging, 10-hour day.",
        dimensions: "N/A", weight: "N/A", powerRequirements: "N/A",
        materials: "N/A",
        pricePerDay: 450, units: 8, condition: "excellent", warehouseLocation: "N/A",
        thumbnailUrl: "",
    },
];

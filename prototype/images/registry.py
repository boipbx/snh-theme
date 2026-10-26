"""Every image the prototype uses — single source for build.py and IMAGE-SOURCES.md.

Rules (round 2 brief): real existing images only, hotlinked; no generated imagery;
anything missing stays a labelled grey placeholder.
"""

SNH = "https://cdn.shopify.com/s/files/1/0258/9625/5550/files/"   # = shopify://shop_images/<file>
AN = "https://cdn.shopify.com/s/files/1/0454/0871/4919/files/"     # appliednutrition.uk
RAW = "https://cdn.shopify.com/s/files/1/0932/3141/5614/files/"    # getrawnutrition.com
RYSE = "https://cdn.shopify.com/s/files/1/2316/6807/files/"        # rysesupps.com
SIS = "https://www.scienceinsport.com/media/"                      # scienceinsport.com

# key: (url, width, height, baked_text, source_page, note)
IMAGES = {
    # --- SNH theme (resolved from shopify://shop_images/…, verified 200 on the CDN) ---
    "snh-athlete-running": (SNH + "running.jpg", 1500, 1800, False, "SNH theme · page.informed-sports (sport tile)", "Real SNH athlete in SNH shirt"),
    "snh-athlete-cricket": (SNH + "cricket.jpg", 1500, 1800, False, "SNH theme · page.informed-sports (sport tile)", "Real SNH athlete in SNH shirt"),
    "snh-sulek-mobile": (SNH + "the-sulek-stack_mobike.jpg", 1200, 1600, False, "SNH theme · index.json slideshow (mobile image)", ""),
    "snh-sulek-desk": (SNH + "the-sulek-stack.jpg", 2800, 1000, False, "SNH theme · index.json slideshow", ""),
    "snh-padel-desk": (SNH + "ehp_labs_landing_page_2.jpg", 2800, 1000, True, "SNH theme · collection.snh-ehplabs slideshow", "SNH × Sri Lanka Padel League partner banner; text baked in. Used as the banner-slide example"),
    "snh-padel-mobile": (SNH + "padel_mobile_landing_page_1.jpg", 1200, 1600, True, "SNH theme · collection.snh-ehplabs slideshow (mobile)", "Text baked in"),
    "snh-store-dehiwala": (SNH + "IMG_2488.png", 6588, 3547, False, "SNH theme · page.locations-info", ""),
    "snh-store-wattala": (SNH + "IMG_2487.png", 6588, 3547, False, "SNH theme · page.locations-info", ""),
    "snh-store-nugegoda": (SNH + "Untitled_design_8e096a2a-793c-4c65-aeb5-672d6da38e8e.png", 6588, 3547, False, "SNH theme · page.locations-info", ""),
    "snh-logo": (SNH + "sn_o.png", 1283, 374, True, "SNH theme · header logo (mobile)", "Logo"),
    "snh-sis-logo": (SNH + "Untitled_240_x_240_px_1.png", 1500, 1500, True, "SNH theme · page.informed-sports", "SiS wordmark on black (logo)"),
    # --- Science in Sport (official) ---
    "sis-campaign-run": (SIS + "wysiwyg/BF-Electrolyte-VideoFrame1.jpg", 1920, 1080, False, "scienceinsport.com homepage hero (video poster frame)", "B&W documentary runner"),
    "sis-campaign-beta": (SIS + "wysiwyg/Phoenix_-_Homepage_Product_Category_-_540_x_880_-_BETA.jpg", 540, 880, False, "scienceinsport.com homepage category tile", "LOW-RES for the 4:5 hero panel (540px wide)"),
    "sis-campaign-hydration": (SIS + "wysiwyg/Phoenix_-_Homepage_Product_Category_-_540_x_880_-_HYDRATION.jpg", 540, 880, False, "scienceinsport.com homepage category tile", "LOW-RES (540px wide)"),
    "sis-pack-hydro": (SIS + "catalog/product/h/y/hydro_single_lemon.png", 1200, 1200, False, "scienceinsport.com · GO Hydro tablets", "Transparent PNG"),
    "sis-pack-beta": (SIS + "catalog/product/b/e/beta_fuel_gel_orange_render_5_1_.png", 1200, 1200, False, "scienceinsport.com · Beta Fuel gel", "Transparent PNG"),
    "sis-pack-noo": (SIS + "catalog/product/b/e/beta_fuel_gel_apple_render_1.jpg", 1200, 1200, False, "scienceinsport.com · Beta Fuel + Nootropics (Apple)", "Opaque white background"),
    "sis-campaign-energy": (SIS + "wysiwyg/Phoenix_-_Homepage_Product_Category_-_540_x_880_-_ENERGY.jpg", 540, 880, False, "scienceinsport.com homepage category tile", "LOW-RES (540px wide)"),
    "sis-pack-go": (SIS + "catalog/product/s/i/sis_isotonic_energy_gel_orange.png", 577, 577, False, "scienceinsport.com · GO Isotonic gel", "LOW-RES (577px) — fine at card size, soft at 2x"),
    # --- RAW Nutrition (official) ---
    "raw-campaign-cbum": ("https://getrawnutrition.com/cdn/shop/files/Social_Media_Store_Photo.jpg?v=1746202236", 1200, 650, False, "getrawnutrition.com og:image", "Chris Bumstead with Itholate; slightly low-res for full-bleed"),
    "raw-pack-itholate": (RAW + "itholate-golden-cookie-front.webp", 1080, 1080, False, "getrawnutrition.com · BUM Itholate Protein", "Transparent. Flavour shown (Golden Cookie) is not one SNH stocks"),
    "raw-pack-thavage": (RAW + "thavage_Raspberry_Lemonade-front_NEW.webp", 4000, 4000, False, "getrawnutrition.com · Thavage Pre-Workout", "Transparent; Raspberry Lemonade = SNH flavour"),
    # --- RYSE (official, transparent PNG renders) ---
    "ryse-pack-protein": (RYSE + "2lb_jp_mf_1_noshadow.png", 2000, 2000, False, "rysesupps.com · Loaded Protein 2lb", "Transparent; flavour shown may differ from SNH stock"),
    "ryse-pack-pump": (RYSE + "brs_1_noshadow_c895d539-a916-49a3-9d6a-8891328d3523.png", 2000, 2000, False, "rysesupps.com · Loaded Pump", "Transparent"),
    "ryse-pack-pre": (RYSE + "cf_30s_1_noshadow_f52b4b21-747c-4a35-8109-009406f3e783.png", 2000, 2000, False, "rysesupps.com · Loaded Pre", "Transparent"),
    "ryse-pack-premax": (RYSE + "brs_1_noshadow_e813055b-f995-4746-87ce-355f61cefc09.png", 2000, 2000, False, "rysesupps.com · Loaded Pre MAX", "Transparent"),
    # --- Applied Nutrition (official) ---
    "an-pack-creatine": (AN + "Creatine_Monohydrate_Professional_250g_266aad7b-aaf2-456f-9b20-885f754fd179.webp", 1200, 1200, False, "appliednutrition.uk · Creatine Monohydrate 250g", "Opaque #CDCDCD backdrop"),
    "an-pack-whey": (AN + "Critical_Whey_Professional_2kg_Chocolate_Milkshake.webp", 1200, 1200, False, "appliednutrition.uk · Critical Whey 2kg", "Opaque #CDCDCD backdrop"),
    "an-pack-multi": (AN + "Multivitamin_Complex_Capsules.webp", 800, 800, False, "appliednutrition.uk · Multi-Vitamin Complex", "LOW-RES (800px); opaque backdrop"),
}

# product handle -> (image key, tile background behind the packshot)
PACKSHOT = {
    "applied-nutrition-creatine-monohydrate": ("an-pack-creatine", "#CDCDCD"),
    "applied-nutrition-critical-whey-2kg": ("an-pack-whey", "#CDCDCD"),
    "applied-nutrition-multi-vitamin-complex": ("an-pack-multi", "#D0D0D0"),
    "sis-go-hydro-tablets": ("sis-pack-hydro", None),
    "sis-beta-fuel-gel": ("sis-pack-beta", None),
    "sis-go-isotonic-energy-gel": ("sis-pack-go", None),
    "raw-cbum-itholate-protein": ("raw-pack-itholate", None),
    "raw-thavage-pre-workout": ("raw-pack-thavage", None),
    "sis-beta-fuel-energy-nootropics-gel": ("sis-pack-noo", "#FFFFFF"),
    "ryse-loaded-protein-2lb": ("ryse-pack-protein", None),
    "ryse-loaded-pump-25-servings": ("ryse-pack-pump", None),
    "ryse-loaded-pre-workout": ("ryse-pack-pre", None),
    "ryse-loaded-pre-max": ("ryse-pack-premax", None),
    # revive-magnesium-glycinate: revivemd.com is an unrelated site (a medical spa); no official packshot -> placeholder
}

USED_IN = {}  # filled by build.py as it renders: key -> set of places


def use(key, where):
    USED_IN.setdefault(key, set()).add(where)
    return IMAGES[key][0]


# Excluded from the prototype on purpose (see IMAGE-SOURCES.md):
GENERATED_NAME_PREFIX = "ChatGPT_Image_"
SUSPECTED_GENERATED = ["bane1.png", "bane2.png", "1.jpg", "2_80f8bbfd-3a76-4dce-86e1-43d638d5107c.jpg",
                       "bundle_off.png", "wellness.png", "protines.png", "3rdcrd.png"]


# ---- live theme images (round 3: allowed, because they are what is live today) ----
_DIMS = {}


def _theme_dims():
    if not _DIMS:
        from pathlib import Path
        for line in (Path(__file__).parent / "theme-dims.tsv").read_text().splitlines():
            fn, w, h = line.split("\t")
            _DIMS[fn] = (int(w), int(h))
    return _DIMS


def theme(fn, where, baked=False, note="", w=None, h=None):
    """Register an image from the live SNH theme (shopify://shop_images/<fn>) and return its CDN URL."""
    key = "theme:" + fn
    if key not in IMAGES:
        dw, dh = _theme_dims().get(fn, (w or 0, h or 0))
        flags = []
        if fn.startswith(GENERATED_NAME_PREFIX):
            flags.append("AI-generated (live today)")
        elif fn in SUSPECTED_GENERATED:
            flags.append("suspected AI-generated (live today)")
        IMAGES[key] = (SNH + fn, w or dw, h or dh, baked, "SNH theme (live)", " · ".join(flags + ([note] if note else [])))
    return use(key, where)

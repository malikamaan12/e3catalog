import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC_IMAGE = 'C:/Users/Admin/.gemini/antigravity/brain/97661fef-ac02-42fb-96d2-30200aedba4c/.user_uploaded/media_1789938642009.png';
const PUBLIC_DIR = 'b:/rental website/rental-app/public';
const APP_DIR = 'b:/rental website/rental-app/src/app';

async function generateBrandAssets() {
    console.log('🎨 Generating authentic E3 Rentals brand assets...');

    // 1. Trim the source image to remove excessive outer transparent space
    const trimmedBuffer = await sharp(SRC_IMAGE)
        .trim()
        .toBuffer();

    const trimmedMeta = await sharp(trimmedBuffer).metadata();
    console.log(`✓ Trimmed original logo: ${trimmedMeta.width}x${trimmedMeta.height}`);

    // 2. Generate public/logo.png:
    // Full brand logo ("E3 rentals") with slight balanced padding (e.g. 12px)
    const logoWithPadding = await sharp(trimmedBuffer)
        .extend({
            top: 12,
            bottom: 12,
            left: 12,
            right: 12,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ compressionLevel: 9, quality: 100 })
        .toBuffer();

    const logoDest = path.join(PUBLIC_DIR, 'logo.png');
    fs.writeFileSync(logoDest, logoWithPadding);
    console.log(`✅ Saved ${logoDest} (${fs.statSync(logoDest).size} bytes)`);

    // 3. Extract the iconic "E3" monogram mark (left side of logo before x=446 in trimmed space)
    const e3MarkBuffer = await sharp(trimmedBuffer)
        .extract({ left: 0, top: 0, width: 446, height: trimmedMeta.height })
        .trim()
        .toBuffer();

    const markMeta = await sharp(e3MarkBuffer).metadata();
    console.log(`✓ Extracted E3 Monogram Mark: ${markMeta.width}x${markMeta.height}`);

    // Save public/logo-mark.png
    const markDest = path.join(PUBLIC_DIR, 'logo-mark.png');
    await sharp(e3MarkBuffer)
        .extend({
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(markDest);
    console.log(`✅ Saved ${markDest}`);

    // 4. Generate Square PWA Icons (192x192 & 512x512) with elegant dark background or transparent
    // PWA manifest icons work best with full bleed or stylish luxury background (#0B0F19 dark navy)
    for (const size of [192, 512]) {
        // Monogram scaled to 75% of the square container
        const targetInner = Math.round(size * 0.70);
        const resizedMark = await sharp(e3MarkBuffer)
            .resize({
                width: targetInner,
                height: targetInner,
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        const iconPath = path.join(PUBLIC_DIR, `icon-${size}x${size}.png`);
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 11, g: 15, b: 25, alpha: 1 } // #0B0F19 luxury dark navy
            }
        })
        .composite([{ input: resizedMark, gravity: 'center' }])
        .png()
        .toFile(iconPath);

        console.log(`✅ Saved ${iconPath} (${size}x${size})`);
    }

    // 5. Generate Favicon (32x32)
    const favSize = 48;
    const favInner = 36;
    const resizedFavMark = await sharp(e3MarkBuffer)
        .resize({
            width: favInner,
            height: favInner,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

    const favPath = path.join(APP_DIR, 'favicon.ico');
    await sharp({
        create: {
            width: favSize,
            height: favSize,
            channels: 4,
            background: { r: 11, g: 15, b: 25, alpha: 1 }
        }
    })
    .composite([{ input: resizedFavMark, gravity: 'center' }])
    .png()
    .toFile(favPath);
    console.log(`✅ Saved ${favPath}`);

    console.log('\n🎉 ALL BRAND ASSETS GENERATED SUCCESSFULLY!');
}

generateBrandAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
});

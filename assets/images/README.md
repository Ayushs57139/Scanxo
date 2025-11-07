# Images Directory

Place all app images in this directory.

## Image Organization

Organize images by category:
- `products/` - Product images
- `banners/` - Promotional banners
- `categories/` - Category icons/images
- `profile/` - User profile images
- `prescriptions/` - Prescription images (if storing locally)

## Image Formats

### Recommended Formats
- **PNG** - For images with transparency, logos, icons
- **JPG/JPEG** - For photos, product images (smaller file size)
- **WebP** - Modern format (smaller than PNG/JPG)

### Image Sizes

For optimal performance and quality:

- **Product Images**: 800x800 pixels (recommended)
- **Banner Images**: 
  - iOS: 1242x2436 pixels
  - Android: 1080x1920 pixels
- **Category Icons**: 200x200 pixels
- **Thumbnails**: 200x200 pixels

## Image Optimization

Before adding images:

1. **Compress images** to reduce app size
2. **Use appropriate formats** (JPG for photos, PNG for graphics)
3. **Provide multiple resolutions** for different screen densities
4. **Optimize file names** (use lowercase, hyphens: `product-image.jpg`)

## Tools for Image Optimization

- [TinyPNG](https://tinypng.com/) - Compress PNG/JPG
- [Squoosh](https://squoosh.app/) - Modern image optimizer
- [ImageOptim](https://imageoptim.com/) - Batch optimization

## Usage in Code

```javascript
import { Image } from 'react-native';

// Local images
<Image source={require('./assets/images/products/product-1.jpg')} />

// Remote images
<Image source={{ uri: 'https://example.com/image.jpg' }} />
```

## Current Implementation

Currently, the app uses placeholder images from placeholder services. Replace these with actual product images in this directory.

## Example Structure

```
images/
├── products/
│   ├── paracetamol.jpg
│   ├── vitamin-d3.jpg
│   └── ...
├── banners/
│   ├── banner-1.jpg
│   ├── banner-2.jpg
│   └── ...
├── categories/
│   ├── pain-relief.png
│   ├── vitamins.png
│   └── ...
└── profile/
    └── default-avatar.png
```


# Icons Directory

Place custom icon images in this directory.

## Icon Sizes

For best results, provide icons in multiple sizes:

- **Small**: 24x24, 32x32 pixels
- **Medium**: 48x48, 64x64 pixels
- **Large**: 128x128, 256x256 pixels

## App Icons

### iOS App Icon
- Size: 1024x1024 pixels
- Format: PNG
- No transparency
- Name: `icon.png`

### Android App Icon
- Size: 1024x1024 pixels
- Format: PNG
- No transparency
- Name: `adaptive-icon.png`

## Icon Formats

- **PNG** - Recommended for icons with transparency
- **SVG** - Scalable vector graphics (use react-native-svg)
- **JPG** - Not recommended for icons (no transparency)

## Usage in Code

```javascript
import { Image } from 'react-native';

<Image source={require('./assets/icons/icon-name.png')} />
```

## Icon Resources

Free icon sources:
- [Icons8](https://icons8.com/)
- [Flaticon](https://www.flaticon.com/)
- [Material Icons](https://fonts.google.com/icons)
- [Feather Icons](https://feathericons.com/)

## Current App

This app uses `react-native-vector-icons` with Material Icons, so custom icons are optional. Place custom icons here if needed for branding or specific requirements.


# Fonts Directory

Place custom fonts in this directory.

## Supported Font Formats
- `.ttf` (TrueType Font)
- `.otf` (OpenType Font)

## Usage

To use custom fonts in your React Native app:

1. Add font files to this directory
2. Update `app.json` to include fonts:

```json
{
  "expo": {
    "fonts": [
      "./assets/fonts/YourFont-Regular.ttf",
      "./assets/fonts/YourFont-Bold.ttf"
    ]
  }
}
```

3. Use fonts in your components:

```javascript
import { useFonts } from 'expo-font';

const [fontsLoaded] = useFonts({
  'YourFont-Regular': require('./assets/fonts/YourFont-Regular.ttf'),
  'YourFont-Bold': require('./assets/fonts/YourFont-Bold.ttf'),
});
```

## Recommended Fonts

For a pharmacy app, consider:
- **Roboto** - Clean, modern, readable
- **Open Sans** - Professional and friendly
- **Lato** - Versatile and clean
- **Montserrat** - Modern and geometric

## Google Fonts

You can download fonts from:
- [Google Fonts](https://fonts.google.com/)
- [Font Squirrel](https://www.fontsquirrel.com/)


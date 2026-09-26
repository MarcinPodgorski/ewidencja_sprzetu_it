import path from 'path';
import type { TFontDictionary } from 'pdfmake/interfaces';

// Roboto wyekstrahowany z wbudowanego vfs_fonts.js pakietu pdfmake — patrz
// server/assets/fonts/README.md. Pełne pokrycie polskich znaków diakrytycznych.
const fontsDir = path.resolve(__dirname, '../../assets/fonts');

export const fontDescriptors: TFontDictionary = {
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
};
